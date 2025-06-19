/**
 * Calculates peaks from an AudioBuffer
 */
export function getPeaksFromAudioBuffer(audioBuffer: AudioBuffer, numberOfPeaks: number): number[] {
    const channelData = audioBuffer.getChannelData(0);
    const peaks: number[] = new Array(numberOfPeaks);
    const samplesPerPeak = Math.floor(channelData.length / numberOfPeaks);

    for (let i = 0; i < numberOfPeaks; i++) {
        const start = i * samplesPerPeak;
        const end = start + samplesPerPeak;
        let max = 0;

        for (let j = start; j < end; j++) {
            const absolute = Math.abs(channelData[j]);
            if (absolute > max) max = absolute;
        }

        peaks[i] = max;
    }

    return normalizePeaks(peaks);
}

/**
 * Normalizes an array of peak values to a range of -1 to 1
 */
export function normalizePeaks(peaks: number[]): number[] {
    let maxPeak = 1;

    for (let i = 0; i < peaks.length; i++) {
        const peak = Math.abs(peaks[i]);
        if (peak > maxPeak) maxPeak = peak;
    }

    for (let i = 0; i < peaks.length; i++) {
        peaks[i] = peaks[i] / maxPeak;
    }

    return peaks;
}

/**
 * Ensures progress value is between 0 and 1
 */
export function normalizeProgress(progress: number): number {
    return Math.max(0, Math.min(1, progress));
}
