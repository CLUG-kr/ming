package Ming;

import java.io.*;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Scanner;
import java.util.TimeZone;

public class SRTReader {
    public Subtitle read (File srtFile) throws IOException, ParseException {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss,SSS");
        sdf.setTimeZone(TimeZone.getTimeZone("UTC"));

        Subtitle result = new Subtitle();
        Scanner itemScanner = new Scanner(srtFile).useDelimiter("\r\n\r\n");

        while (itemScanner.hasNext()) {
            String text = itemScanner.next();
            Scanner componentScanner = new Scanner(text.replace("\uFEFF", ""));
            if (!componentScanner.hasNext()) {
                System.out.println("No int _" + componentScanner.nextLine() + "_");
                break;
            }
            int counter = componentScanner.nextInt();
            componentScanner.nextLine(); // Consume line.
            String second = componentScanner.nextLine();
            String[] splitted = second.split("-->");
            long startTimestamp = sdf.parse("1970-01-01 " + splitted[0]).getTime();
            long endTimestamp = sdf.parse("1970-01-01 " + splitted[1]).getTime();
            StringBuilder textBuilder = new StringBuilder();
            while (componentScanner.hasNextLine()) {
                textBuilder.append(componentScanner.nextLine());
                if (componentScanner.hasNextLine()) {
                    textBuilder.append("\n");
                }
            }

            Subtitle.Item item = new Subtitle.Item();
            item.startTimestamp = startTimestamp;
            item.endTimestamp = endTimestamp;
            item.text = textBuilder.toString();
            result.items.add(item);
        }
        return result;
    }
}
