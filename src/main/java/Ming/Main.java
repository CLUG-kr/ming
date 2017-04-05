package Ming;

import net.bramp.ffmpeg.FFmpeg;
import net.bramp.ffmpeg.FFmpegExecutor;
import net.bramp.ffmpeg.FFprobe;
import net.bramp.ffmpeg.builder.FFmpegBuilder;
import org.apache.commons.cli.*;

import java.io.File;
import java.io.IOException;


public class Main {
    public static void main(String[] args) {
        if (args.length == 0) { // 임시 코드
            SpeechToTextService service = new SpeechToTextService();

            System.out.println("Trying to recognize ... ");
            String result = service.recognize(new File("src/test/resources/sample_audio/open-the-goddamn-door.wav"));
            System.out.println("Result: " + result);
            return;
        }
        Options options = new Options();
        options.addOption(Option.builder("h")
                .longOpt("help")
                .desc("print this message")
                .build()
        );
        options.addOption(Option.builder()
                .longOpt("test")
                .desc("trigger a test method for development experience.")
                .hasArg()
                .argName("testMethodName")
                .build()
        );

        try {
            CommandLineParser parser = new DefaultParser();
            CommandLine cmd = parser.parse(options, args);
            if (cmd.hasOption("help")) {
                // automatically generate the help statement
                HelpFormatter formatter = new HelpFormatter();
                formatter.printHelp("ming", options, true);
                return;
            }
            if (cmd.hasOption("test")) {
                switch (cmd.getOptionValue("test")) {
                    case "extract_sound": {
                        String[] targets = cmd.getArgs();
                        if (targets.length < 2) {
                            System.out.println("you must provide [src_video_file] [dst_audio_file_path]");
                            return;
                        }
                        String source = targets[0];
                        String destinationPath = targets[1];
                        try {
                            FFmpeg ffmpeg = new FFmpeg("ffmpeg");
                            FFprobe ffprobe = new FFprobe("ffprobe");

                            FFmpegBuilder builder = new FFmpegBuilder()

                                    .setInput(source)     // Filename, or a FFmpegProbeResult
                                    .overrideOutputFiles(true) // Override the output if it exists

                                    .addOutput(destinationPath)   // Filename for the destination
                                    .setFormat("mp3")        // Format is inferred from filename, or can be set
//                                    .setTargetSize(250_000)  // Aim for a 250KB file
//
//                                    .disableSubtitle()       // No subtiles
//
//                                    .setAudioChannels(1)         // Mono audio
//                                    .setAudioCodec("aac")        // using the aac codec
//                                    .setAudioSampleRate(48_000)  // at 48KHz
//                                    .setAudioBitRate(32768)      // at 32 kbit/s
//
//                                    .setVideoCodec("libx264")     // Video using x264
//                                    .setVideoFrameRate(24, 1)     // at 24 frames per second
//                                    .setVideoResolution(640, 480) // at 640x480 resolution
//
//                                    .setStrict(FFmpegBuilder.Strict.EXPERIMENTAL) // Allow FFmpeg to use experimental specs
                                    .done();

                            FFmpegExecutor executor = new FFmpegExecutor(ffmpeg, ffprobe);

                            // Run a one-pass encode
                            executor.createJob(builder).run();

                        } catch (IOException e) {
                            e.printStackTrace();
                        }
                    }
                    break;
                    default:
                        throw new UnsupportedOperationException("commons-cli 에 테스트 시나리오가 연결 되지 않음!");
                }
                return;
            }
            throw new UnsupportedOperationException("commons-cli 에 처리 되지 못 한 사용 예.");
        } catch (ParseException e) {
            e.printStackTrace();
        }
    }
}