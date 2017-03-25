package Ming;

import com.ibm.watson.developer_cloud.speech_to_text.v1.SpeechToText;
import com.ibm.watson.developer_cloud.speech_to_text.v1.model.SpeechResults;
import com.ibm.watson.developer_cloud.speech_to_text.v1.model.Transcript;

import java.io.File;
import java.util.List;

// TODO: Abstract the service provider.
public class SpeechToTextService {
    public String recognize(File audio) {
        SpeechToText service = new SpeechToText();
        service.setUsernameAndPassword("", "");
        SpeechResults results = service.recognize(audio).execute();
        List<Transcript> result = results.getResults();
        StringBuilder builder = new StringBuilder();
        for (int j = 0; j < result.size(); j++) {
            for (int i = 0; i < result.get(j).getAlternatives().size(); i++) {
                builder.append(i + ": \"");
                builder.append(result.get(j).getAlternatives().get(i).getTranscript());
                builder.append("\"\n");
            }
        }
        return builder.toString();
    }
}
