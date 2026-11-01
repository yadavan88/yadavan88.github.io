---
title: "ScalaNative - Build Native Applications In Scala"
pubDatetime: 2022-04-27T15:06:17.000Z
description: "Native application using Scala Native"
tags:
  - "scala"
ogImage: "/images/posts/scalanative-build-native-applications-in-scala/OCSoJHKXk.jpg"
---
> Learn how to build native applications using **Scala Native**, an ahead-of-time compiler plugin that doesn't require JVM for execution. Discover how to easily incorporate C code into your Scala projects and how to make HTTP calls using the powerful curl library. Read on to get an understanding of Scala Native and create high-performance, native applications.

## Introduction

Scala started as a language that runs on JVM and is interoperable with existing Java libraries. However, running on JVM has some limitations. Especially, the apps running on JVM has slow to startup and also takes a good amount of memory. This makes the JVM based applications not so suitable for running on machines with low specs. Also, long startup time makes it less usable for building short lived applications like command line tools or aws lambdas.

Due to these problems, Scala team has developed *Scala-Native*. In this blog, let's look at what is Scala Native and how to use it.

## About Scala Native

Scala Native is an ahead-of-time compiler plugin for building native applications. **Scala Native enables to write Scala code and create native applications that doesn't need JVM to execute**. Scala Native plugin converts the Scala code directly into machine language and hence JVM is not needed for execution of the application.

## Advantages of Scala Native

Some of the advantages of Scala Native are:

* Faster Startup and lower memory footprint
    
* Utilise almost all powers of the Scala Language to build Native application
    
* Interoperability with native C code (and also C++/Rust)
    
* Better control of features like memory allocation to improve performance on low spec machines
    

## How it works ?

Scala Native Compiler compiles the Scala files into an intermediate format called **Native Intermediate Representation (NIR)**. *NIR* is an intermediate format which captures additional information like low level primitives, linking hints etc. This format is then converted into [LLVM IR](https://llvm.org/) format. LLVM IR is an intermediate format before the code is converted into the machine language. Languages like C, C++, Rust and many others compiles the code into LLVM IR. The LLVM IR compiler will then convert the code to the assembly format.

## Scala Native in Action

### Dependencies

To develop application using Scala Native, there are a few conditions that should be met on the development environment:

* At least JDK 8
    
* Clang 6.0 or above
    

### Installation

To use Scala Native, we need to add the SBT plugin first:

```scala
addSbtPlugin("org.scala-native" % "sbt-scala-native" % "0.4.4")
```

Then we can enable the plugin in *build.sbt*:

```scala
enablePlugins(ScalaNativePlugin)
```

Unfortunately, we can't use every Scala libraries in our project. Only the libraries those are (cross)built for Scala Native can be used. To use the Scala Native version, we need to use the symbol %%% in SBT. For example, to use the library *mainargs*, we can add:

```scala
"com.lihaoyi" %%% "mainargs" % "0.2.2"
```

That's it, now we can use this library like normally and create a native application in Scala.

### Cons

There are a few points to notice while building Scala Native applications. Some of them are:

* Due to licensing issues with Oracle, all the standard Java Libraries are re-written from scratch. However, it is not expected to have any difference in processing
    
* Multi Threading is not supported yet
    

### Package and Run the Native Application

We can write a simple application which is essentially a println statement.

```scala
object SillyNativeApp {
  def main(args: Array[String]): Unit =
    println("This line is printed from a Scala Native Application")
}
```

Now, we can run the sbt command to compile and build the application as a native one.

```scala
sbt nativeLink
```

This will create a native executable in the target directory and it can be executed easily.

## Interoperability with C Code

Scala Native can invoke C code directly. This helps to make use of c libraries to handle low level optimisations which otherwise might be difficult from Scala code.

Scala Native already has implemented wrappers around most of the standard C libraries and they can be invoked directly from the Scala code almost like any other Scala APIs.

### Invoking C Wrappers

We can invoke the Scala Native provided C library wrappers very easily. For that, we need to import the wrapper method. For instance, to use C String operations, we can import:

```scala
import scala.scalanative.libc.string
```

Then, we can invoke the necessary method:

```scala
val strLength: CSize = string.strlen(c"Hello ScalaNative")
```

*CSize* is a ScalaNative type which is equivalent to C size\_t to store the result returned by *sizeof* operator. The c interpolator (*c""*) converts the Scala String type to C style string literal. We can print the length of the string using *println* statement:

```scala
println("Length: "+ strLength.toLong)
```

We can convert a String between Scala and C using *toCString()* and *fromCString()*. However, it needs an implicit parameter *Zone* in the scope. Zone does the necessary memory allocation and deallocation to convert the variable.

```scala
val hello = "Hello "
val world = "World"
val helloWorld: String = Zone { implicit z =>
    val combined = string.strcat(toCString(hello), toCString(world))
    fromCString(combined)
}
println(helloWorld) //prints Hello World
```

### Invoking Method from C File

We can also invoke methods from C files directly in Scala. For that, we need to first create a signature of the method we are going to call in our Scala File.

Let's assume that we have a custom method in C which returns the length of the input string:

```scala
#include <string.h>
#include <stdio.h>
int get_length(char arr[]) {
  int len = strlen(arr);
  printf("Length of `%s` is : %d ", arr, len);
  printf("\n");
  return len;
}
```

We need to to keep this file in the Scala Native project under the path *resources/scala-native/*. Then we need to create a method in Scala which matches this C method signature:

```scala
@extern
object string_oper {
  def get_length(str: CString): Int = extern
}
```

The *extern* annotation is to inform the compiler that this method is a native method call. We will only provide the keyword *extern* in the method's implementation. This informs the Scala Native compiler to link an external native method when *get\_length* is invoked.

Now, we can invoke this method from our Scala code directly:

```scala
string_oper.get_length(c"Good Morning")
```

### Using Third Party C Libraries

In the previous section, we invoked a standard c library in a file. Let's look at how we can use third party C libraries with Scala Native application.

For this, we will be using *curl* library in C. **We need to make sure that the required libraries are already installed in the development machine as well as in the target machine**.

Let's write a C method which invokes a HTTP API to decode a *base64* string. We will use *curl* to make the HTTP call. As usual, we will keep this file under *resources/scala-native/* path.

```scala
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <curl/curl.h>
 
void function_pt(void *ptr, size_t size, size_t nmemb, void *stream){
    printf("\nResult from curl C: %d", atoi(ptr));
}

int base64_decode(char arr[])
{
  CURL *curl;
  CURLcode res;
 
  curl = curl_easy_init();
  if(curl) {
    char *url = "http://httpbin.org/base64/";
    char *combined = malloc(strlen(url)+strlen(arr)+1);
    strcpy(combined, url);
    strcat(combined, arr);
    curl_easy_setopt(curl, CURLOPT_URL, combined);
    curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
 
    res = curl_easy_perform(curl);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, function_pt);
    printf("\nGET API Status enum value: %d \n",res);

    if(res != CURLE_OK)
      fprintf(stderr, "curl_easy_perform() failed: %s\n",
              curl_easy_strerror(res));
 
    free(combined);
    curl_easy_cleanup(curl);
  }
  return 0;
}
```

Now that we created the C file, we can create the extern method corresponding to the C method:

```scala
@extern
@link("curl")
object curl_app {
  def base64_decode(str: CString): Int = extern
}
```

Here, we have additionally used an annotation *@link*. This annotation will notify the scala native compiler to link the provided library when packaging. Please note that the library name is *libcurl*, but while providing we will omit *lib* and give only *curl*. This is the standard format in C to link libraries by name.

Now we can use the method *base64\_decode* in our Scala code:

```scala
val text = "U2NhbGEgTmF0aXZl"
Zone { implicit z =>
    curl_app.base64_decode(toCString(text))
}
```

## Conclusion

In this article, we looked at how we can use Scala Native to build native applications. We also saw different ways to invoke C code from Scala directly. All the sample code used in this article is available in [GitHub](https://github.com/yadavan88/learn-scala-native).
