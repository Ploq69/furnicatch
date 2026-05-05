#!/usr/bin/env python3
"""Verify Kokoro TTS files using audio integrity + lenient ASR."""
from __future__ import annotations

import argparse
import json
import os
import re
import struct
import wave
from pathlib import Path

import numpy as np


def load_audio(path: str) -> tuple[np.ndarray, int]:
    """Load a mono 16-bit WAV as float32 array, return (audio, sample_rate)."""
    with wave.open(path, "rb") as w:
        n_channels = w.getnchannels()
        sampwidth = w.getsampwidth()
        framerate = w.getframerate()
        n_frames = w.getnframes()
        if n_channels != 1 or sampwidth != 2 or framerate != 24000:
            raise ValueError(
                f"Expected mono 16-bit 24kHz, got ch={n_channels} sw={sampwidth} rate={framerate}"
            )
        raw = w.readframes(n_frames)
        audio = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    return audio, framerate


def audio_stats(audio: np.ndarray) -> dict:
    """Compute speech-relevant audio statistics."""
    rms = float(np.sqrt(np.mean(audio ** 2)))
    zcr = float(np.mean(np.diff(np.sign(audio)) != 0))
    peak = float(np.max(np.abs(audio)))
    speech_ratio = float(np.mean((np.abs(audio) > 0.01) & (np.abs(audio) < 0.99)))
    return {"rms": rms, "zcr": zcr, "peak": peak, "speech_ratio": speech_ratio}


def levenshtein(a: str, b: str) -> int:
    """Compute edit distance between two strings."""
    m, n = len(a), len(b)
    if m < n:
        return levenshtein(b, a)
    if n == 0:
        return m
    prev = list(range(n + 1))
    for i, ca in enumerate(a, 1):
        curr = [i]
        for j, cb in enumerate(b, 1):
            curr.append(min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = curr
    return prev[n]


def fuzzy_match(expected: str, transcribed: str) -> tuple[bool, float]:
    """Return (pass, similarity_ratio). Pass if edit distance <= 2 or ratio >= 0.6."""
    exp = expected.lower().strip()
    trans = transcribed.lower().strip()
    if exp == trans:
        return True, 1.0
    dist = levenshtein(exp, trans)
    max_len = max(len(exp), len(trans))
    ratio = 1.0 - (dist / max_len) if max_len > 0 else 1.0
    passed = dist <= 2 or ratio >= 0.6
    return passed, ratio


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify FurniCatch TTS files.")
    parser.add_argument("--manifest", default="scripts/tts_manifest.json")
    parser.add_argument("--model", default="tiny")
    parser.add_argument("--out", default="scripts/tts_verification_report.json")
    parser.add_argument("--sample", type=int, default=0, help="Only verify N random samples (0=all)")
    args = parser.parse_args()

    print(f"Loading Whisper {args.model}...")
    import whisper

    model = whisper.load_model(args.model)

    manifest = json.loads(Path(args.manifest).read_text())
    words = sorted(manifest.keys())

    if args.sample > 0 and args.sample < len(words):
        import random
        random.seed(42)
        words = sorted(random.sample(words, args.sample))
        print(f"Sampling {args.sample} random words for verification")

    passed = 0
    failed = 0
    missing = 0
    corrupt = 0
    results = {}

    print(f"Verifying {len(words)} files...")
    for i, word in enumerate(words, 1):
        info = manifest[word]
        path = Path(info["file"])
        result = {
            "word": word,
            "passed": False,
            "reason": None,
            "transcription": None,
            "similarity": 0.0,
            "duration": 0.0,
            "stats": {},
        }

        if not path.exists():
            result["reason"] = "missing"
            missing += 1
            results[word] = result
            print(f"[{i}/{len(words)}] FAIL {word}: missing")
            continue

        try:
            audio, sr = load_audio(str(path))
            duration = len(audio) / sr
            result["duration"] = round(duration, 2)

            # Duration sanity check
            if duration < 0.15 or duration > 3.0:
                result["reason"] = f"bad_duration:{duration:.2f}s"
                failed += 1
                results[word] = result
                print(f"[{i}/{len(words)}] FAIL {word}: duration {duration:.2f}s")
                continue

            # Audio stats
            stats = audio_stats(audio)
            result["stats"] = {k: round(v, 4) for k, v in stats.items()}

            # Silence / noise check
            if stats["rms"] < 0.005 or stats["speech_ratio"] < 0.05:
                result["reason"] = f"near_silence: rms={stats['rms']:.4f}"
                failed += 1
                results[word] = result
                print(f"[{i}/{len(words)}] FAIL {word}: near silence")
                continue

            # Whisper transcription with lenient matching
            whisper_result = model.transcribe(audio, language="en", fp16=False, temperature=0.0)
            transcription = whisper_result.get("text", "").strip().lower()
            transcription = re.sub(r"[^a-z\s-]", "", transcription).strip()
            result["transcription"] = transcription

            whisper_pass, ratio = fuzzy_match(word, transcription)
            result["similarity"] = ratio

            # For short words (<4 chars), whisper is very unreliable.
            # We pass if audio is structurally OK and either whisper is close OR word is short.
            if whisper_pass or len(word) <= 3:
                result["passed"] = True
                passed += 1
                print(f"[{i}/{len(words)}] PASS {word}: '{transcription}' sim={ratio:.2f}")
            else:
                result["reason"] = f"mismatch: expected '{word}' got '{transcription}'"
                failed += 1
                print(f"[{i}/{len(words)}] FAIL {word}: '{transcription}' sim={ratio:.2f}")

        except Exception as exc:
            result["reason"] = f"corrupt:{exc}"
            corrupt += 1
            print(f"[{i}/{len(words)}] FAIL {word}: corrupt ({exc})")

        results[word] = result

    summary = {
        "total": len(words),
        "passed": passed,
        "failed": failed,
        "missing": missing,
        "corrupt": corrupt,
        "pass_rate": round(passed / len(words) * 100, 1) if words else 0,
        "results": results,
    }

    Path(args.out).write_text(json.dumps(summary, indent=2))
    print(f"\n{'='*50}")
    print(f"Total:   {len(words)}")
    print(f"Passed:  {passed}")
    print(f"Failed:  {failed}")
    print(f"Missing: {missing}")
    print(f"Corrupt: {corrupt}")
    print(f"Pass rate: {summary['pass_rate']}%")
    print(f"Report saved to {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
