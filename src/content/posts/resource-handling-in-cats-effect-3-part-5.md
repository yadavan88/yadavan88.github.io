---
title: "Resource Handling in Cats Effect 3 [Part 5]"
pubDatetime: 2022-05-13T14:45:42.000Z
description: "For example, if we are opening a file to read and forgets to close it when done, this will lead to memory leaks and eventual crash of the application. So, it is very important that these resources..."
tags:
  - "scala"
  - "cats-effect"
---
## Introduction
This is the fifth part of the Cats Effect 3 [blog series](/tags/cats-effect/). In this part, we will look at resource handling in Cats Effect 3. 

## Why is Resource Handling Important?
Resources are generally things like Files, Sockets, DB connections, etc which are used to read/write from external sources. The general approach is to **acquire access to a resource, performs an action and closes the resource.** Improper handling of these resources like not closing after the usage etc can cause very severe situations in any application. 

For example, if we are opening a file to read and forgets to close it when done, this will lead to memory leaks and eventual crash of the application.
So, it is very important that these resources are handled carefully. However, sometimes,  developer might forget to do so since there is validation/enforcement by most of the libraries/frameworks. 

Generally, there are 3 parts for any resource handling:
- Acquire a resource
- Use the resource and perform operations
- Close/Release resource

Cats Effect provides multiple ways to make sure that the resources are handled properly. Let's look at these ways in detail.

## Bracket Pattern
Bracket Pattern is a way by which Cats Effect enforces to follow the good practises. Let's look at a simple example of file read operation.
Let's first create implement the 3 main steps of resource handling:

```
// acquire resource
def getSource(fileName: String): IO[BufferedSource] = IO(Source.fromResource(fileName))

// use resource
def readFile(src: Source): IO[String] = IO(src.getLines.mkString).trace <* IO("Processing completed").trace

// close/release resource
def closeSource(src: Source): IO[Unit] = IO(src.close) <* IO("Source closed successfully").trace
``` 
Now, let's apply the bracket pattern. We can apply the *bracket()* method on the acquired IO. It takes two parameters as curried. First one is the usage of the resource and second part is the release. This way, we are forced to provide the release block for any resource using the bracket pattern. This may be compared to *try-catch-finally* block in Java.
Let's see how we can combine the above 3 parts:

```
val fileContent: IO[String] = fileIO.bracket(src => readFile(src))(src => closeSource(src))
``` 
Even if there is any error occurred while processing the file content, the *bracket* will make sure to invoke the *closeSource()*.

If we want to handle the source success, failure and cancellation differently, we can use *bracketCase* instead of *bracket*:

```
val bracketWithCase: IO[String] = fileIO.bracketCase(src => failedProcessingIO(src))((src, outcome) =>
    outcome match {
      case Succeeded(s) =>
        IO("[Bracket Case] successfully processed the resource").trace >> closeSource(src) >> IO.unit
      case Errored(s) =>
        IO("[Bracket Case] Failed while processing").trace >> closeSource(src) >> IO.unit
      case Canceled() =>
        IO("[Bracket Case] Canceled the execution").trace >> closeSource(src) >> IO.unit
    }
 )
``` 

This is neat, however, **when there are more resources involved and are used as nested resources, the code becomes a bit clunky**. For example, here is a sample implementation of bracket pattern with 3 nested resources(takes from cate-effect website):

![image.png](/images/posts/resource-handling-in-cats-effect-3-part-5/Wnp6VTHp3.png)

In this case, Cats Effect provides another better way to handle the resource. 

## Resource
*Resource* in Cats Effect is a very powerful data structure to handle any type of resources. It removes all the pains of bracket pattern when multiple resources are involved.

We can make a *Resource* by using the *make* method. While making the resource, we provide both the *acquire* and *release* implementation of the resource. For example, let's rewrite the same file read from the *bracket* example:

```
val resource: Resource[IO, Source] = Resource.make(getSource(fileName))(src => closeSource(src))
``` 
Now, the resource is ready and opening and closing the resource is also setup already.
Next, we can use the method *use* on the *resource* to process the contents:

```
val fileContentUsingResource1: IO[String] = resource.use(src =>
    IO("Reading file content from 1st file ").trace >> readFile(src)
)
``` 
We can also combine multiple sources easily since Resource is a monad and we can apply for-comprehension on it.
Let's try to use multiple resources. For that, we can make another resource to read from a second file:

```
val anotherResource: Resource[IO, Source] = Resource.make(getSource("another_file.txt"))(src => closeSource(src))
``` 
We can combine the resources using for-comprehension:

```
val combinedResource: Resource[IO, (Source, Source)] = for {
  res1 <- resource
  res2 <- anotherResource
} yield (res1, res2)

``` 
Now, we can *use* both the resources and combine the file content:

```
val combinedContent: IO[String] = combinedResource.use((src1, src2) =>
  for {
    content1 <- readFile(src1)
    content2 <- readFile(src2)
  } yield content1 + content2
)
``` 

**This will acquire both the resources in the order in which it is mentioned. Then after the usage, both the resources will be released in the reverse order of acquire.**


## Finaliser using *guarantee* and *guaranteeCase*
Apart from brackets and Resource, Cats Effect provide another way to apply some finaliser. If we want to execute a block of code on completion of an IO no matter it is succeeded, failed or cancelled, we can use *guarantee*. Let's look at it with a simple example:

```
val successIO: IO[String] = IO("Simple IO").trace 
val successIOWithFinaliser = successIO.guarantee(IO("The IO execution finished and this finaliser is applied").trace.void)
``` 
On finishing *successIO*, the attached guarantee case will be executed.
The same will apply for failure as well:

```
val failedIO: IO[String] = successIO >> IO.raiseError(new Exception("Failed during execution")).trace >> IO("IO completed")
val failedIOWithFinaliser = failedIO.guarantee(IO("The IO execution finished and this finaliser is applied").trace.void)
``` 
The method `guarantee()` doesn't distinguish between success, failure and cancelled cases. For all the three scenarios, the same finaliser is applied. If we want to treat the cases differently, we can use *guaranteeCase* instead:

```
def applyGuaranteeCase[A](io: IO[A]): IO[A] = {
    io.guaranteeCase {
      case Succeeded(success) =>
        success.flatMap(msg =>
          IO("IO successfully completed with value: " + msg).trace.void
        )
      case Errored(ex) =>
        IO("Error occurred while processing, " + ex.getMessage).trace.void
      case Canceled() => IO("Processing got cancelled in between").trace.void
    }
}
``` 

## Conclusion
In this part, we looked at different ways to handle resources in Cats Effect 3. As usual, the sample code used here is available in [GitHub](https://github.com/yadavan88/cats-effect-intro) repo under *part5*.
