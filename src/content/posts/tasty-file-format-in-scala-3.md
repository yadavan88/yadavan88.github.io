---
title: "TASTy File Format in Scala 3"
pubDatetime: 2022-04-24T09:21:59.000Z
description: "TASTy format captures more detailed informations regarding types and other advanced features in Scala 3. The Scala compiler converts the Scala files into TASTy format(.tasty). This .tasty file is..."
tags:
  - "scala"
  - "scala3"
---
## Introduction
Scala is a language built on top of JVM. That means, *.scala* files are compiled into *.class* files by the Scala compiler. 

## Problems with .class File
When the Java or Scala files are converted into .class files, the types are erased and those information regarding the types are lost. That means, in the class file, 
```
val names: List[String] = List("yadu", "krishnan")
```
the variable *names* will have the type as *List[Object]* instead of *List[String]*. 
Similarly advanced features in Scala like parametrised traits, union types etc can't be properly represented in class files. 

## TASTy Format
To handle such problems, a new intermediate format, TASTy is introduced in Scala 3. TASTy is an abbreviation for "*Typed Abstract Syntax Trees*". 

TASTy format captures more detailed informations regarding types and other advanced features in Scala 3. The Scala compiler converts the Scala files into TASTy format(*.tasty*). This *.tasty* file is later converted into *.class* files for the JVM to understand. The Scala compiler will use .tasty files if it is available and hence it is able to make use of the more detailed information to optimise and also helps in binary interoperability of the Scala files.

To support backward compatibility and easier migration from Scala 2.13, a Tasty file reader was introduced in Scala 2.13.6. This way, the Scala projects using versions 2.13.6 or above can make use of Scala 3 libraries(except macros). In the same way, Scala 3 compiler has the ability to read the projects written in Scala 2.13.6 or above. 


![tasty.png](/images/posts/tasty-file-format-in-scala-3/qO_2RAKTi.png)

## Conclusion
TASTy intermediate format helps to easily migrate Scala 2.13 projects to Scala 3 and also provides forward and backward compatibility for Scala 3 based projects.
