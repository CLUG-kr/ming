package Ming;

import java.io.File;

public class Main {
    public static void main(String[] args) {
        SpeechToTextService service = new SpeechToTextService();

        System.out.println("Trying to recognize ... ");
        String result = service.recognize(new File("src/test/resources/sample_audio/open-the-goddamn-door.wav"));
        System.out.println("Result: " + result);
    }
}