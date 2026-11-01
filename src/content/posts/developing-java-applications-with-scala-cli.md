---
title: "Developing Java Applications with Scala-CLI"
pubDatetime: 2024-07-01T16:59:48.000Z
description: "Discover how to easily create small Java projects without the need for Maven or other complex build systems."
tags:
  - "java"
  - "scala"
  - "scala-cli"
ogImage: "/images/posts/developing-java-applications-with-scala-cli/5c6b9c338cb86b8f61266ae5c10b87cd.jpeg"
---
## Introduction

[Scala-CLI](https://scala-cli.virtuslab.org/) is a relatively new tool that simplifies learning Scala and building simple applications. I wrote a [detailed blog](/posts/scala-made-simple-for-beginners-a-gentle-introduction-to-kickstarting-your-scala-learning/) about the features of Scala-CLI to build applications in Scala.

However, it is also possible to write pure Java applications using this same tool. In this tutorial, let's have a quick look at how we can write pure Java code and use Scala-CLI to build and execute it.

## Set-Up

We can [install](https://scala-cli.virtuslab.org/install/) the Scala-CLI application using any of the methods mentioned in the official documentation.

Once installed, verify that it is working fine by using the command:

```bash
scala-cli
```

If it is installed successfully, running the above command starts a Scala REPL as below:

![](/images/posts/developing-java-applications-with-scala-cli/72d77ddc-f948-4603-b5d8-3963030baa66.png)

We can exit the REPL for now as we are not going to use the REPL directly.

We can also verify the installation just by checking the version using the command:

```bash
scala-cli --version
```

This prints the Scala-CLI version along with the Scala version as:

![](/images/posts/developing-java-applications-with-scala-cli/b8a0abb5-ebe4-4735-968b-52860edddb2a.png)

For this article, I am going to use VS Code. Please install the vs code extension "Metals" for the Scala-CLI to provide highlight, navigation and auto complete features. <mark>Also, there is a chance that other Java extensions might conflict with the metals extension and might cause incorrect errors in the IDE. </mark> In my case, I had the vs code suggested extension "Extension Pack for Java" which caused issue for me, so I disabled it.

## Basic Usage

Now that the setup is ready, let's write a simple Java class and test the execution. We can create a new directory and use a simple text editor to create a simple Java Hello World application.

I created the directory `scala-cli-java` to keep the file `HelloWorld.java` using the content:

```java
 class HelloWorld {
	public static void main(String args[]) {
		System.out.println("Hello, Java World, from Scala-CLI!");
	}
}
```

We can run this file by using the command:

```java
scala-cli HelloWorld.java
```

This executes the Java code and prints the message to the console. We don't need to set up JDK to run this code. Scala-CLI automatically downloads the JDK and uses it to run it.

It's also good to run the command in the working directory:

```bash
scala-cli setup-ide .
```

**This generates the necessary metadata for the Metals plugin to provide code completion and navigation features.** Once it's is run, we can open the directory in editor such as VS Code.

## Using Specific Java Version

In the previous code, we never set up or mentioned the JDK version anywhere. ScalaCLI uses the default version(now 17) to build the app.

However, we can very easily specify the required Java version in the code itself, using a special syntax called ***directives***. Directives in Scala-CLI are special lines that start with `//>` and we can use them to define meta information for the build. ***The directives must be placed before any Java code including import and package statements***.

Using the directive, we can set a specific Java version:

```java
//> using jvm 17
```

This uses the specified Java version to build the code. Just by specifying the number 17, it uses the latest OpenJDK(Temurin/Adopt) version. We can also specify a different JVM distribution if we want:

```java
//> using jvm zulu:17
```

This downloads and uses Zulu JDK v17 for compiling and running the code.

The [list of JDKs](https://github.com/coursier/jvm-index/blob/master/index.json) are provided by the tool [Coursier](https://github.com/yadavan88/coursier-cheatsheets), which is used by the Scala-CLI under the hood for managing JVMs.

## Using Third-party Dependencies

We can also use the dependencies from MavenCentral in the Scala-CLI app. It uses the directive `dep` to define the dependency:

```java
//> using dep com.google.code.gson:gson:2.8.9
```

This adds the *gson* dependency to the project. We can similarly provide any Maven dependencies using the format `GroupId:ArtifactId:Version`. Similarly, if we want to use `commons-lang3` from apache-commons, we can use the directive as `//> using dep org.apache.commons:commons-lang3:3.14.0`

Now, we can import the necessary classes and use them.

We can write a more complicated Java application that uses the REST invocation and JSON processing using Scala-CLI. Let's paste the below content into a file called *JavaAppWithDep.java*:

```java

//> using jvm 17
//> using dep com.google.code.gson:gson:2.8.9
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import java.util.List;
import com.google.gson.JsonDeserializer;
import com.google.gson.GsonBuilder;

record CountryRecord(String name, String code, String capital, List<String> languages) {}
public class JavaAppWithDep {
    public static void main(String args[]) throws Exception {
        JsonDeserializer<CountryRecord> deserializer = (json, typeOfT, context) -> {
            var jsonObject = json.getAsJsonObject();
            String name = jsonObject.get("name").getAsString();
            String code = jsonObject.get("code").getAsString();
            String capital = jsonObject.get("capital").getAsString();
            List<String> languages = context.deserialize(jsonObject.get("languages"), new TypeToken<List<String>>() {
            }.getType());
            return new CountryRecord(name, code, capital, languages);
        };

        HttpClient httpClient = HttpClient.newHttpClient();
        URI uri = URI.create("https://raw.githubusercontent.com/yadavan88/blog-code-samples/main/countries.json");
        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(uri)
                .build();
        HttpResponse<String> httpResponse = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
        Gson gson = new GsonBuilder()
                .registerTypeAdapter(CountryRecord.class, deserializer)
                .create();
        List<CountryRecord> countries = gson.fromJson(httpResponse.body(), new TypeToken<List<CountryRecord>>() {
        }.getType());
        countries.forEach(System.out::println);
    }
}
```

This code above downloads a JSON file from a GitHub URL, parses it using GSON, converts it into a record, and prints the output to the console.

We can execute it by using the command as before:

```bash
scala-cli JavaAppWithDep.java
```

When we execute it, we get the output as:

![](/images/posts/developing-java-applications-with-scala-cli/d1f6483d-f46c-40d2-9b8b-90fd5eee86b4.png)

We can see that Scala-CLI even suggested updating the library dependencies based on the availability from Maven Central, which is really awesome :)

## Setting Java Options

Similar to dependencies, we can even configure the Java options using directives:

```java
//> using javaProp user=yadu
//> using javaOpt -Xmx2g, -Dkey=myvalue
public class JavaOptions {
    public static void main(String[] args) {
        var key = System.getProperty("key");
        var user = System.getProperty("user");
        System.out.println("Value for key: " + key);
        System.out.println("Value for user: " + user);
    }
}
```

The directive above sets the Java option for `Xmx` and passes a custom argument `key` to the program. Similarly, we can also pass Java properties to the program by using `javaProp`.

There are more such properties and settings. You may refer to [this page](https://scala-cli.virtuslab.org/docs/reference/directives/) for more details.

## Packaging

Scala-CLI also lets you create packages of your classes easily. Let's package the Java app we wrote before that downloads the JSON and parses it using GSON:

```bash
scala-cli --power package JavaAppWithDep.java -o javaApp --assembly
```

This creates an executable application with the name as `javaApp`. The flag `--assembly` informs Scala-CLI to build an assembly jar(not a library jar). It is important to use the flag `--power` as this task is considered a power user command.

This creates the jar and an executable script so that we can run the app by using the command:

```bash
./javaApp
```

When I execute this, I get the same output as before:

![](/images/posts/developing-java-applications-with-scala-cli/5df99e63-b920-4d78-b1b9-e112a12aeb3b.png)

Instead of creating a wrapper script, if we want only to create an executable jar, we can add the flag `--preamble=false`:

```bash
scala-cli --power package JavaAppWithDep.java -o javaApp.jar --assembly --preamble=false
```

Here I renamed the output `javaApp.jar` and also added the passed preamble as false. Now we need to run the jar using the command:

```bash
java -jar javaApp.jar
```

There are more options to build as a docker image, graalvm app, scala-native app, OS-specific formats such as deb, and more. You may find those details [here](https://scala-cli.virtuslab.org/docs/commands/package).

## Exporting to Maven

Scala-CLI allows to export the project into a maven project. It creates the pom file with the relevant dependencies and also links any resource file if you are using it in the scala-cli project. So, with just one command, a maven project can be generated:

```scala
scala-cli export --power MyJavaFile.java --mvn -o my-proj
```

This creates a maven project with directory name as `my-proj` and prepares the necessary dependencies in the pom.xml.

## Conclusion

In this article, we explored how Scala-CLI can be utilized to build Java applications. Scala-CLI is versatile, capable of building both Scala and Java apps, and brings a rich feature set to Java codebases. With Scala-CLI, you can leverage features such as packaging, switching between different JVM versions, passing Java options, exporting as maven project and more. For smaller applications, you can bypass traditional build tools like Maven and create applications with just a single Java file.

However, since it is not Java-centric, features like code completion and navigation might not work as expected.

The sample code used in this article can be accessed [on GitHub](https://github.com/yadavan88/blog-code-samples/tree/main/scala-cli-sample/scala-cli-java).
