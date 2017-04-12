package Ming;

import com.ibm.watson.developer_cloud.speech_to_text.v1.SpeechToText;
import com.ibm.watson.developer_cloud.speech_to_text.v1.model.RecognizeOptions;
import com.ibm.watson.developer_cloud.speech_to_text.v1.model.SpeechResults;
import com.ibm.watson.developer_cloud.speech_to_text.v1.model.SpeechTimestamp;
import com.ibm.watson.developer_cloud.speech_to_text.v1.model.Transcript;

import java.io.File;
import java.util.List;

// TODO: Abstract the service provider.
public class SpeechToTextService {
    public String recognize(File audio) {
        SpeechToText service = new SpeechToText();
        String username = System.getenv("SPEECH_TO_TEXT_BLUEMIX_USERNAME");
        String password = System.getenv("SPEECH_TO_TEXT_BLUEMIX_PASSWORD");
        if (username == null || password == null) {
            System.err.println("ERROR: BLUEMIX credentials for speech to text is not set.");
            return null;
        }
        service.setUsernameAndPassword(username, password);
        SpeechResults results = service.recognize(audio, new RecognizeOptions.Builder()
                .continuous(true)
                .timestamps(true)
                .build()).execute();
        List<Transcript> result = results.getResults();
        StringBuilder builder = new StringBuilder();
        for (int j = 0; j < result.size(); j++) {
            builder.append("Transcript 1:\n");
            Transcript transcript = result.get(j);
            List<SpeechTimestamp> words = transcript.getAlternatives().get(0).getTimestamps();
            for (int i = 0; i < words.size(); i++) {
                builder.append("[" + words.get(i).getStartTime() + " " + words.get(i).getEndTime() + "] ");
                builder.append(words.get(i).getWord() + "\n");
            }
        }
        return builder.toString();
    }
}
