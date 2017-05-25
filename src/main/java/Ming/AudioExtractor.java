package Ming;

import net.bramp.ffmpeg.FFmpeg;
import net.bramp.ffmpeg.FFmpegExecutor;
import net.bramp.ffmpeg.FFprobe;
import net.bramp.ffmpeg.builder.FFmpegBuilder;

import java.io.File;
import java.io.IOException;
import java.util.concurrent.TimeUnit;

public class AudioExtractor {
    private final String outputAudioFormat = "ogg";
    private FFmpegExecutor m_executor;
    private String m_inputFilepath;
    AudioExtractor() throws IOException{
        m_executor = new FFmpegExecutor(new FFmpeg("ffmpeg"), new FFprobe("ffprobe"));
    }
    AudioExtractor(String inputFilepath) throws IOException {
        this();
        setInput(inputFilepath);
    }
    public void setInput(String inputFilepath) {
        m_inputFilepath = inputFilepath;
    }
    public String extract(long startOffset, long duration) throws IOException {
        String output = File.createTempFile(startOffset + "_" + duration, "." + outputAudioFormat).getAbsolutePath();

        m_executor.createJob(new FFmpegBuilder()
                .setInput(m_inputFilepath)
                .overrideOutputFiles(true)
                .addOutput(output)
                .disableVideo()
                .setFormat(outputAudioFormat)
                .setAudioSampleRate(16000)
                .done()
        ).run();

        return output;
    }
}
