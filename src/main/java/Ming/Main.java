package Ming;

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
                String[] targets = cmd.getArgs();
                switch (cmd.getOptionValue("test")) {
                    case "extract_sound": {
                        if (targets.length < 2) {
                            System.out.println("you must provide [src_video_file] [dst_audio_file_path]");
                            return;
                        }
                        String source = targets[0];
                        String destinationPath = targets[1];
                        try {
                            AudioExtractor extractor = new AudioExtractor(source);
                            long offset = 33 * 60 * 1000 + 676;
                            long duration = 21 * 1000 + 133;
                            File output = new File(extractor.extract(offset, duration));
                            File dest = new File(destinationPath);
                            output.renameTo(dest);
                        } catch (IOException e) {
                            e.printStackTrace();
                        }
                    }
                    break;
                    case "read_srt":
                        if (targets.length < 1) {
                            System.out.println("you must provide [srt_file]");
                            break;
                        }
                        SRTReader srtReader = new SRTReader();
                        try {
                            System.out.println(targets[0]);
                            Subtitle st = srtReader.read(new File(targets[0]));
                            System.out.println(st.items.size());
                            Subtitle.Item item = st.items.get(2411);
                            System.out.println(item.startTimestamp);
                            System.out.println(item.endTimestamp);
                            System.out.println("_" + item.text + "_");

                        } catch (java.text.ParseException e) {
                            e.printStackTrace();
                        } catch (IOException e) {
                            e.printStackTrace();
                        }
                        break;
                    case "senario1":
                        if (targets.length < 3) {
                            System.out.println("you must provide [video_file] [srt_file] [current_playback_position]");
                            break;
                        }
                        String videoFilepath = targets[0];
                        String srtFilepath = targets[1];
                        long playback_position = Integer.parseInt(targets[2]);
                        try {
                            System.out.println("Find subtitle");
                            Subtitle subs = new SRTReader().read(new File(srtFilepath));
                            int position = -1;
                            for (int i=0; i<subs.items.size(); i++) {
                                if (subs.items.get(i).startTimestamp > playback_position) {
                                    position = i;
                                    break;
                                }
                            }
                            if (position < 0) {
                                System.out.println("Unavailable playback position: " + playback_position);
                                return;
                            }
                            System.out.println("Extract Audio");
                            AudioExtractor extractor_ = new AudioExtractor(videoFilepath);
                            File output = new File(extractor_.extract(subs.items.get(position).startTimestamp, subs.items.get(position).endTimestamp - subs.items.get(position).startTimestamp));
                            System.out.println("Speech To Text: " + output.getAbsolutePath());
                            SpeechToTextService service = new SpeechToTextService();
                            String result = service.recognize(output);
                            System.out.println(result);
                            // TODO:
                            // 4. Compare the text and subtitle contents.
                        } catch (Exception e) {
                            e.printStackTrace();
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