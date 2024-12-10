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
    const maxPeak = Math.max(...peaks.map(Math.abs), 1);
    return peaks.map(peak => peak / maxPeak);
}

/**
 * Ensures progress value is between 0 and 1
 */
export function normalizeProgress(progress: number): number {
    return Math.max(0, Math.min(1, progress));
}
