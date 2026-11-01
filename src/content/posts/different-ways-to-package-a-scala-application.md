---
title: "Different Ways To Package A Scala Application"
pubDatetime: 2022-01-29T09:36:26.000Z
description: "Different ways to create scala app packaging using scala-cli, sbt-assmbly and sbt-native-packager"
tags:
  - "scala"
  - "package"
  - "scala-basics"
ogImage: "/images/posts/different-ways-to-package-a-scala-application/iVwTAIZCUN.png"
canonicalURL: "https://github.com/yadavan88/scala-app-packaging-methods"
---
> Learn how to package your Scala application with ease using some powerful tools: sbt-assembly, sbt-native-packager, jlink, sbt-proguard, and Scala-cli command line tool. This guide walks you through the installation and usage of each tool and includes a sample of a small application.

## 1. Introduction

In this small article, let's look at different ways in which we can package our simple Scala application.

## 2. Assumption

For this to work, I am assuming the below conditions are met:

* JDK is installed. You may use [Coursier](https://github.com/yadavan88/coursier-cheatsheets) to manage JDK.
    
* Scala version above 2.12 is installed. I am using Scala 3 for the example here.
    
* Probably an IDE like VS Code(with Metals) or IntelliJ IDEA or any other editor is installed
    

## 3. SBT Assembly

[SBT](/posts/unlocking-the-power-of-sbt-a-beginners-guide-to-understanding-not-so-common-features/) is the most commonly used build tool for Scala applications. An executable jar file is the simplest packaging we can create to run on multiple platforms. The only requirement is to have a JRE.

[*sbt-assembly*](https://github.com/sbt/sbt-assembly) is a very simple plugin that can be used to create jar files for your Scala application. Let's look at how we can use *sbt-assembly* to build a jar file.

First of all, we need to create a simple sbt project.

In the `plugins.sbt`, add the sbt-assembly dependency as:

```scala
addSbtPlugin("com.eed3si9n" % "sbt-assembly" % "2.1.3")
```

After re-importing the sbt build, we are ready. Since it is an auto plugin, the default settings are automatically applied. Let's proceed with creating a small application.

Let's add a dependency for the project. This is just to show that the dependencies are also packaged within the jar and we can run the assembly jar without any additional configurations for classpath. In this particular example, I am using `os-lib` library as a dependency.

Now, we can create our sample scala class:

```scala
package com.yadavan88.app

@main def mainMethod() =
  val path = os.pwd.toString
  println(s"""
    | Hello from the packaged app! 
    | Current Path: ${path}
    """.stripMargin)
```

That's it. We are now ready to create a packaged jar with just a few configurations in `build.sbt`.

To create the package, we need to run the sbt command:

```scala
sbt assembly
```

This will create the jar file under the path `target/scala-<version>/app-packaging-assembly-1.0.2.jar` from the project root. For each Scala version, the path will change accordingly.

We can now execute the jar file from the directory as: `java -jar app-packaging-assembly-1.0.2.jar`

By default sbt-assembly uses the project name and the version number to generate the jar file name.

Sbt-assembly also provides advanced configuration options. We can set a name for the jar file using:

```scala
assembly / assemblyJarName := "assemblyApp.jar"
```

Now, the jar file will be named as `assemblyApp.jar`.

Similarly, if there are multiple main classes in the project, we can provide the main class for the jar:

```scala
assembly / mainClass := Some(
  "com.yadavan88.app.mainMethod" 
)
```

Similarly, a lot more configuration options are available. More details are given on the [sbt-assembly github](https://github.com/sbt/sbt-assembly) page.

## 4. SBT Native Packager

SBT Assembly is a good plugin to create a jar file. But if the project is getting bigger, sbt-assembly might be a bit difficult to manage. Especially, we might need to provide a lot of rules to handle deduplication. Also, it is not possible to create any other packaging formats using sbt-assembly. Here comes the use of [sbt-native-packager](https://github.com/sbt/sbt-native-packager).

SBT Native Packager allows us to create a wide variety of native packaging formats like *exe*, *zip*, *msi*, *docker*, etc.

Let's first add the plugin dependency to the `plugins.sbt` file:

```scala
addSbtPlugin("com.github.sbt" % "sbt-native-packager" % "1.9.16")
```

After importing the build, now we can add the relevant configurations in *build.sbt*:

```scala
enablePlugins(JavaAppPackaging)
```

Now we can run the sbt command:

```scala
sbt Universal/packageBin
```

This will create a zip package under `<project_root>/target/universal` which can then be copied to anywhere and unzipped. It will contain two scripts (windows and unix based scripts) under the directory `bin`. We can just execute this script to run our application.

Instead of universal, we can also execute platform-specific commands to generate the package. For example, to generate a Debian package, we can run:

```scala
Debian/packageBin
```

For Windows:

```scala
sbt Windows/packageBin
```

Similarly, we can create *rpn* package, mac package, graalvm native image, etc.

**However, please note that there may be prerequisites to generate these platform-specific packages. For example, to generate** `msi` package for Windows, the system should have *WIX* toolkit installed. Similarly, for Debian packaging, there should be relevant dpkg tools already installed

We can add more configurations in the *build.sbt* to customize the package.

```scala
maintainer := "Yadukrishnan <yadavan88@gmail.com>"
Compile / mainClass := Some("com.yadavan88.app.mainMethod")
```

More such configuration options are available in the sbt-native-packager [documentation](https://sbt-native-packager.readthedocs.io/en/stable/formats/universal.html).

We can also use *jlink* based packaging in sbt-native-packager. *jlink* is a Java tool that can identify and embed a minimal JRE to the application. That means the target system doesn't need to have JRE/Java installed. To enable it, we can add this line to *build.sbt*:

```scala
enablePlugins(JlinkPlugin)

jlinkIgnoreMissingDependency := JlinkIgnore.only(
  "scala.quoted" -> "scala",
  "scala.quoted.runtime" -> "scala"
)
```

While building, there is a chance that you might be getting some errors due to unresolved dependencies. This can be manually suppressed by adding the ignore configurations for those that are not really needed for the runtime. In the previous example, *jlink* was not able to find the library for `scala.quoted` package. Since we don't need it at runtime, we can ignore it. This might become tricky if the project gets bigger or if it uses some specific libraries that can't be packaged.

The *jlink* plugin now will copy all the dependencies and the JRE libraries to a specific path, then package the app using the universal plugin. So, we can now execute the command:

```scala
sbt Universal/packageBin
```

The generated zip file will have the JRE libraries within. This can be now copied and run in another system even without JRE installed.

**NOTE: However, currently the generating system and the target system should be the same. That means, if the app needs to be run on a Windows machine, the *jlink* packaging also should be done on another Windows machine.**

## 5. SBT Proguard

Proguard is a tool to optimize, obfuscate, and package a Java app. This is very useful in creating a shrinked application. [sbt-proguard](https://github.com/sbt/sbt-proguard) is an SBT plugin that can be used to package the scala application using Proguard.

First, we need to add the plugin to the plugins.sbt file:

```scala
addSbtPlugin("com.github.sbt" % "sbt-proguard" % "0.5.0")
```

Now we need to enable it in `build.sbt` and add the relevant configurations:

```scala
enablePlugins(SbtProguard)
Proguard / proguardOptions ++= Seq("-dontoptimize","-dontnote", "-dontwarn", "-ignorewarnings")
Proguard / proguardOptions += ProguardOptions.keepMain("com.yadavan88.app.mainMethod")
Proguard / proguardInputs := (Compile / dependencyClasspath).value.files
Proguard / proguardFilteredInputs ++= ProguardOptions.noFilter((Compile / packageBin).value)
```

**Please note the Proguard options. These options are used by the Proguard to optimize and obfuscate the code. In this case, the flag** `dontoptimize` is used since Proguard was corrupting the Scala code while rewriting. More information regarding the Proguard options are available [here](https://www.guardsquare.com/manual/configuration/usage)

Now, let's run the sbt command:

```scala
sbt proguard
```

This will generate the executable jar file under the path `<project_root>/target/scala-<version>/proguard`. We can now run the app like any other jar file, using the `java -jar <jarname.jar>`.

Please note the jar file size generated by the Proguard plugin. In my case, it is just 1MB, whereas the jar file generated by the assembly plugin is 7MB.

## 6. Scala-cli

[Scala-cli](/posts/scala-made-simple-for-beginners-a-gentle-introduction-to-kickstarting-your-scala-learning/) is a new command line tool that can be used to write and run Scala programs. It can be used as a replacement for scala REPL and ammonite REPL/script. However, we can also use Scala-cli to package small applications and make them executables. The advantage of Scala-cli is that it doesn't need *sbt* or any other plugins to create the packaging.

First, let's install the Scala-cli. The installation instructions are available [here](https://scala-cli.virtuslab.org/). After installed, let's verify it by running the command `scala-cli`.

Now, let's create the class:

```scala
//> using scala "3.3.1"
//> using dep com.lihaoyi::os-lib:0.9.1
package com.yadavan88.scalacli
import os._

object ScalaCliApp {
  @main def app() = {
    val path = os.pwd.toString
    println(s"""
                | Hello from the scala-cli packaged app!
                | Current Path: ${path}
                """.stripMargin)
  }
}
```

**This sample code is placed outside the src directory to avoid *sbt* compile issue since the Scala-cli syntax is not compatible with sbt. The file is available under the path** `<project_root>/ScalaCLIApp.scala`

The line starting with `using` has a special meaning in Scala-cli. It is called `directives`, which are like configurations. In this example, it tells the Scala-cli to use a specific Scala version to compile and build the application. For additional dependencies, we can provide the maven coordinates of the required libraries.

Note that, we can use any supported Scala versions. Scala-cli internally uses [coursier](https://github.com/yadavan88/coursier-cheatsheets) to manage the dependencies.

Now, let's package our small app using the `package` task of Scala-cli:

```scala
scala-cli --power package ScalaCliApp.scala -o smallApp
```

Scala-cli creates a package with all the dependencies along with our code. We can specify the app name using `-o` flag. The above command when executed will generate the app `cliapp`. We can execute the app using `./smallApp`.

Here is a [cheat-sheet](https://github.com/yadavan88/ScalaCLI-Cheatsheet) of the most useful Scala-CLI commands.

**Note: Scala-cli might not be a good option if many files and dependencies are involved. In such a case, we can use a full-build tool like SBT.**

## 7. Conclusion

We have seen different ways in which we can package our Scala application as executable packages. The sample code used here is available [here on GitHub](https://github.com/yadavan88/blog-code-samples). Please refer to the `small-app` directory for the exact usage.
