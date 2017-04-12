package Ming;

import java.util.ArrayList;
import java.util.List;

public class Subtitle {
    public static class Item {
        public String text;
        public long startTimestamp, endTimestamp;
    }
    public List<Item> items;
    Subtitle() {
        items = new ArrayList<Item>();
    }
}
