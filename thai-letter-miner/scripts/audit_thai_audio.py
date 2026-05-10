#!/usr/bin/env python3
import math
import struct
import sys
import wave
from audit_common import AUDIO, parse_manifest, ok, fail


def wav_stats(path):
    with wave.open(str(path), "rb") as wav:
        frames = wav.readframes(wav.getnframes())
        sample_rate = wav.getframerate()
        channels = wav.getnchannels()
        width = wav.getsampwidth()
        duration = wav.getnframes() / sample_rate if sample_rate else 0
        if width != 2 or not frames:
            return sample_rate, duration, 0
        count = len(frames) // 2
        samples = struct.unpack("<" + "h" * count, frames)
        if channels > 1:
            samples = samples[::channels]
        rms = math.sqrt(sum(sample * sample for sample in samples) / max(1, len(samples))) / 32768
        return sample_rate, duration, rms


def main():
    print("THAI AUDIO")
    errors = 0
    bad = []
    missing = []
    for item in parse_manifest():
        path = AUDIO / f"{item['id']}.wav"
        if not path.exists():
            missing.append(item["id"])
            continue
        try:
            sample_rate, duration, rms = wav_stats(path)
        except Exception as exc:
            bad.append((item["id"], f"unreadable: {exc}"))
            continue
        if sample_rate != 24000:
            bad.append((item["id"], f"sample rate {sample_rate}"))
        if duration < 0.25 or duration > 8:
            bad.append((item["id"], f"duration {duration:.2f}s"))
        if rms < 0.003:
            bad.append((item["id"], f"quiet/silent rms {rms:.4f}"))

    if not missing:
        ok("every manifest item has a WAV")
    else:
        fail(f"missing WAVs: {missing[:12]}{'...' if len(missing) > 12 else ''}")
        errors += 1
    if not bad:
        ok("all WAV files are readable 24 kHz non-silent clips")
    else:
        fail(f"bad WAVs: {bad[:12]}{'...' if len(bad) > 12 else ''}")
        errors += 1
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
