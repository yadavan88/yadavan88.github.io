---
title: "Synchronisation and Concurrent Access in Cats Effect 3 [Part 7]"
pubDatetime: 2022-05-25T22:17:39.000Z
description: "We can mainly use 2 different ways to create a Ref:"
tags:
  - "scala"
  - "cats-effect"
---
## Introduction
This is the part 7 of the Cats Effect 3 [blog series](/tags/cats-effect/). In this part, we will be looking at the synchronisation primitives available in CE3.

## Synchronisation and Concurrency
When we have multiple fibers/threads working on the same datasets, it becomes important to have a safe concurrent access and synchronisations to the shared states. Cats Effect provides a wide variety of options to handle such cases. 

## Ref
*Ref* provides a thread-safe concurrent access and modification of the shared states. Under the hood, it uses Java's *AtomicReference*, but provides a functional way to handle it. Let's look at how to create and modify states using Ref.

We can mainly use 2 different ways to create a Ref:

```
val mutableState: IO[Ref[IO, Int]] = Ref[IO].of(100)
val mutableStateV2: IO[Ref[IO, Int]] = IO.ref(100)
``` 
We can use the method *get* to get the value from a Ref. Similarly, we can use *set* method to set value of a Ref variable. The method *getAndSet* returns the current value and also set a new value to the Ref. Let's look at these methods in action:

```
val refOps = for {
  ref <- IO.ref(0) //initialises a Ref
  value <- ref.get.trace // returns 0
  _ <- ref.set(1) //sets the ref with value 1
  oldValue <- ref.getAndSet(5).trace //returns 1 and set 5
  _ <- ref.get.trace //returns 5
} yield ()
``` 
CE also provides some additional methods such as *update*, *updateAndGet* and *getAndUpdate*. They are similar to *get* and *set* methods, but it allows to pass a function to modify the state:

```
val refWithFns = for {
  ref <- IO.ref("Hello World")
  cap <- ref.getAndUpdate(_.toUpperCase).trace //returns str and then make ref upper case
  str <- ref.get.trace // prints str in uppercase
  _ <- ref.update(_.toLowerCase) //update the state
  strV2 <- ref.get.trace // prints str in all lower
  firstWord <- ref.updateAndGet(_.split("\\s").head.toUpperCase()).trace
} yield ()
``` 
There is a method called *modify*, which does similar as *update*. But modify allows to return a different return type after the state is updated. For example, we can use the *ref* from previous example and see how to use *modify*:

```
val refWithModify = for {
  ref <- IO.ref("Hello World")
  currentStr <- ref.get.trace // prints Hello World
  _ = println("Length of current string is :" + currentStr.length) // returns 11
  len <- ref.modify(value => (value.toUpperCase + "!", value.length)).trace //similar to getAndUpdate, but returns length
  newStr <- ref.get.trace //prints HELLO WORLD!
  _ = println("Length of updated string is: " + newStr.length) //returns 12
} yield ()
``` 

## Deferred
*Deferred* is something similar to the concept of *Promise*. It stores a value which is not yet available. While creating a *Deferred*, it will be empty. It can then be *completed once* with the value. 

It has 2 important methods, *get* and *complete*. The *get* method blocks(sematically) until the value is available in the deferred variable. The method *complete* is used to complete a deferred variable and all the fibers which invoked *get* method will be notified of the value being ready. We can create a deferred variable by using the method *deferred* on IO.
Let's create a program to make coffee using Deferred:

```
def developer(coffeeSignal: Deferred[IO, String]) = for {
  _ <- IO("Developer wants to drink coffee and waiting for it to be ready").trace
  _ <- coffeeSignal.get.trace // impatiantly waiting on coffee machine for it to be prepared
  _ <- IO("Started sipping the divine coffee.. ").trace
} yield ()

def coffeeMachine(coffeeSignal: Deferred[IO, String]) = for {
  _ <- IO("Verifying water and coffee beans").trace
  grindingFib <- (IO("Grinding Coffee Beans").trace >> IO.sleep(Random.nextInt(500).millis) >> IO("Grinding complete").trace ).trace.start
  boilingFib <- (IO("Boiling Water").trace >> IO.sleep(Random.nextInt(500).millis) >> IO("Boiling complete").trace).start
  _ <- grindingFib.join
  _ <- boilingFib.join
 _ <- IO("Adding milk").trace
  _ <- IO.sleep(100.millis)
  _ <- coffeeSignal.complete("Coffee Ready!")
} yield ()

def makeCoffee = for {
  coffeeSignal <- IO.deferred[String]
  fib1 <- developer(coffeeSignal).start
  fib2 <- coffeeMachine(coffeeSignal).start
  _ <- fib1.join
  _ <- fib2.join
} yield ()
``` 

## Semaphore

Semaphore is a concurrency synchronisation concept where we can restrict the number of threads that can access some resource simultaneously. Semaphore contains a positive number of permits. Any fibers/threads that need to access thee guarded resource need to acquire a permit. After the access is done, the permit is released. If the available permits is zero, all the incoming fibers will be sematically blocked until something becomes available.

Semaphore defines methods such as *acquire*, *release*, *acquireN* and *releaseN*.

Let's try to implement a bathroom scenario with semaphores. Assume that there are only 2 washrooms. If more than 2 people needs to access the washrooms at the same time, some of them will have to wait for the others to complete and get out:


```
def accessWashroom(person: String, sem: Semaphore[IO]): IO[Unit] = for {
  _ <- IO(s"[$currentTime] $person wants to access the washroom, waiting for getting the access").trace
  _ <- sem.acquire
  _ <- IO(s"[$currentTime] $person got access to washroom and using it now").trace
  _ <- IO.sleep(5.second)
  _ <- IO(s"[$currentTime] $person left the washroom").trace
  _ <- sem.release
} yield ()

val persons = (1 to 5).map("Person-" + _).toList
val washroomAccessPgm = for {
  washrooms <- Semaphore[IO](2)
  fibers <- persons.map(p => accessWashroom(p, washrooms).start).sequence
  _ <- fibers.map(_.join).sequence
} yield ()
``` 
 If we run the *washroomAccessPgm*, we can see that some of the persons are made to wait outside the washroom until some of them becomes available.

## Count Down Latch

Countdown latch is a synchronisation primitive that awaits until a pre-defined number of  fibers are awaiting on it. A countdown latch is initialised with a positive number. When  *release* is invoked on it, the latch number is reduced by 1. When the latch value becomes 0, the latch is opened and the execution is resumed.
That means, the execution will continue only if the desired number of fibers releases on the latch. 
Let's implement a multi approval scenario with the countdown latch:


```
def accessSafeLocker(approvals: CountDownLatch[IO]) = for {
  _ <- IO("Need to access safe locker.").trace
  _ <- approvals.await
  _ <- IO("Safe Locker opened and accessing the contents now").trace
} yield ()

def getApprovals(approvals: CountDownLatch[IO]) = for {
  _ <- IO("Requesting approvals for safe access").trace
  _ <- IO("Officer 1 Approval in progress").trace >> IO.sleep(Random.between(500, 1500).millis) >> IO("Officer 1 Approved").trace
  _ <- approvals.release
  _ <- IO("Officer 2 Approval in progress").trace >> IO.sleep(Random.between(500, 1500).millis) >> IO("Officer 2 Approved").trace
  _ <- approvals.release
  _ <- IO("Officer 3 Approval in progress").trace >> IO.sleep(Random.between(500, 1500).millis) >> IO("Officer 3 Approved").trace
  _ <- approvals.release
} yield ()

def safeAccessProcess = for {
  approvals <- CountDownLatch[IO](3)
  fib <- accessSafeLocker(approvals).start
  _ <- getApprovals(approvals)
  _ <- fib.join
} yield ()
``` 
In the above process, only if 3 officers approve the request, then only the access is granted. If any one of the officers doesn't grant access(release latch), then the access to safe is not possible.

## Cyclic Barrier

Countdown latch is a single use synchronisation method. Once the latch is opened, then we can't reuse that CountDownLatch. **Cyclic Barrier is almost similar to countdown latch, but it is re-usable**.  

We can create a cyclic barrier by providing a positive number as:

```
val cyclicBarrier: IO[CyclicBarrier[IO]] = CyclicBarrier[IO](2)
``` 
We can use the method *await* on cyclicBarrier to wait for the desired number of participants. In the above code, when 2 fibers invoke *await* on *cyclicBarrier*, it continues the execution.

## Conclusion
In this part, we looked at different primitives for handling synchronisation in out concurrent application. The sample code used in this blog is available in [GitHub](https://github.com/yadavan88/cats-effect-intro) under the package *part7*.
