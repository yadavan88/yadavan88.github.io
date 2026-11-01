---
title: "Traversing Cats Effect IOs [Part-3]"
pubDatetime: 2022-05-03T16:02:11.000Z
description: "In this part, let's look at different ways to combine and traverse multiple IOs."
tags:
  - "scala"
  - "cats-effect"
---
## 1. Introduction
This is the part 3 of the *Cats Effect 3* blog series. In the previous two parts, we looked at different ways to create IOs and also some of the common methods that are applied on IOs. You may refer to the complete series [here](/tags/cats-effect/).

In this part, let's look at different ways to combine and traverse multiple IOs. 

## 2. map, flatMap and for-comprehension
In the previous parts, we have already learned the usage of map, flatMap and for-comprehension. They helps to chain multiple IO types and operate on each of them. 
We also looked at other combinators like `>>`, `*>` and `&>` which also does the chaining, albeit with some slight differences.  
Except `&>` the other methods execute the IOs sequentially on the same thread.

We can verify that with a small example, by adding the thread name to the print statements. 
First, let's create an extension method on IO to add the print statement. This helps to print the thread name while executing the IOs.

```
extension [A](io: IO[A])
  def trace: IO[A] = for {
    res <- io
    _ = println(s"[${Thread.currentThread.getName}] " + res)
  } yield res
``` 
 We can import this extension wherever needed and apply the `.trace` method to log the thread name.
Let's try to apply the same for for-comprehension:

```
val io1 = IO("Hello ")
val io2 = IO("World ").trace
val forCombined = for {
  res1 <- io1.trace
  res2 <- io2.trace
} yield ()
``` 
When we execute the forCombined IO, we will see the thread name to be the same. This will apply for `flatMap`, `>>` and `*>` as well.
How, let's try to use `&>` :

```
val parCombined = io1.trace &> io2.trace
``` 
When `parCombined` is run, we can notice the thread name to be different for each IOs. That means, each of the IOs are started in parallel and then combined.

## 3. Using *mapN* and *tupled* method
The above methods will return only one of the results of the participating IOs unless explicitly handled. We can get the result of all the participating IOs by using the `mapN` extension method from *cats*.
We need to first add the import statement to bring the method to scope:
```
import cats.syntax.apply._
```
Now, we can apply the mapN method:

```
val catMapN: IO[(String, String)] = (io1,io2).mapN((i,j) => (i,j))
``` 
If we just need to combine 2 IOs into a tuple without doing any transformation, we can also use the `tupled` method: 

```
val catTupled: IO[(String, String)] = (io1,io2).tupled
``` 
Note that both *mapN* and *tupled* methods will execute the IOs sequentially only.

## Parallel Execution Using *parMapN* and *parTupled*
If we want to execute the IOs in parallel, we can use *parMapN*. it is similar to `&>` but helps to apply more transformations on the results. 
We need to add the below import statement to use *parMapN*:

```
import cats.syntax.parallel._
``` 
Then, we can use as below. Note that trace method is applied to verify that different threads are used:

```
val parMapIO: IO[String] = (io1.trace, io2.trace).parMapN(_ + _).trace
``` 

If we want to just compute both the IOs in parallel and get the result as a tuple, we can use `parTupled` as well. 

```
val parTupledIO = (io1.trace, io2.trace).parTupled.trace
``` 

## Converting IOs Inside Out using *traverse* and *sequence* 
Sometimes, we might be having a collection of IOs. It becomes difficult to use such collection on IOs together. Instead, it is easier if we convert it to IO of collections. 

Some of you might be familiar with the *Future.sequence* method to convert List[Future] to Future[List]. We can do the similar thing in IOs as well. Let's see how we can use sequence on IOs.

Firstly, we need to bring an typeclass instance of the required collection from cats library. Please note this typeclass is defined in *cats* and not in *cats-effect*. 

```
val listTraverse = Traverse[List]
``` 
Now, we can apply *sequence* on IOs as:

```
val ioList: List[IO[String]] = List(io1, io2)
val insideOutIOs: IO[List[String]] = listTraverse.sequence(ioList)
``` 
The sequence method just make the collection of IO inside out. However, there is another very powerful method which can also apply some transformation while taking the result inside out. It is called as `traverse`. 

The traverse method is also applied on the same Traverse typeclass instance. It takes 2 parameters as curried. First one is the collection of IOs. The second part is a function which processes each of the IOs within the collection. 
Let's look at it with an example for more clarity:

```
val ioList: List[IO[String]] = List(io1, io2)
val insideOutIOs: IO[List[String]] = listTraverse.sequence(ioList)
val traversedList: IO[List[String]] = listTraverse.traverse(ioList)(io => io.map(_ + "!"))
``` 
The second function which adds `!` symbol to the string is passed as the 2nd part of *traverse*. 

We can implement *sequence* method we saw before using the *traverse* and an *identity* function:

```
val seqAsTraverse: IO[List[String]] = listTraverse.traverse(ioList)(identity)
``` 

## Parallel *traverse* and *sequence* methods
Similar to mapN, there is a parallel version for *traverse* and *sequence*. They are named as *parTraverse* and *parSequence*.  These methods are available as extension methods from cats and need to be imported to use it:

```
import cats.syntax.parallel._
``` 
Now, we can apply *parTraverse* and *parSequence* as :

```
val parTraverseIOs: IO[List[String]] = ioList.parTraverse(identity)
val parSeq: IO[List[String]] = ioList.parSequence
``` 
## Conclusion
In this part, we mainly looked at traverse, sequence, parTraverse and parSequence to process collection of IOs. The code samples referred in this article is available in [GitHub](https://github.com/yadavan88/cats-effect-intro) under the package *part3*.
