import java.io.*;
import java.lang.reflect.*;

/**
 * Wrapper that forces System.out to flush after every write,
 * so prompts (System.out.print) appear immediately before stdin reads.
 */
public class FlushRunner {
    public static void main(String[] args) throws Exception {
        // Replace System.out with an auto-flushing variant
        PrintStream out = new PrintStream(new FileOutputStream(FileDescriptor.out), true) {
            @Override
            public void write(byte[] buf, int off, int len) {
                super.write(buf, off, len);
                flush();
            }
            @Override
            public void write(int b) {
                super.write(b);
                flush();
            }
        };
        System.setOut(out);

        // Invoke user's main class
        Class<?> userClass = Class.forName(args[0]);
        Method main = userClass.getMethod("main", String[].class);
        main.invoke(null, (Object) new String[0]);
    }
}
