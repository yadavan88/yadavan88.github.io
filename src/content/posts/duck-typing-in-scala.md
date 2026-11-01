---
title: "Duck Typing In Scala"
pubDatetime: 2022-04-04T18:08:25.000Z
description: "Duck Typing or Structural Typing in Scala"
tags:
  - "scala"
  - "scala-basics"
ogImage: "/images/posts/duck-typing-in-scala/mR7SWc8XT.png"
---
> In this blog post, we delve into the world of Duck Typing or Structural Typing, a concept commonly used in dynamically typed languages like Javascript and Python. We also explore three distinct methods to define and invoke generic methods: Inheritance, Duck Typing, and Type Classes.

## 1. Introduction

**Duck Typing** is a common and widely used concept in dynamic typed languages like Javascript and Python. In duck typing, the method defined is more important than the type or class.

Duck Typing is generally explained by the quote: "*If it walks like a duck and it quacks like a duck, then it must be a duck*". More details about Duck Typing can be read [here](https://en.wikipedia.org/wiki/Duck_typing).

Duck Typing is used to handle scenarios when there is some similarity with the behaviours of otherwise completely different types. In Scala, we can handle similar situations in multiple ways. In this blog, let's look at such different in Scala.

## 2. Inheritance

Generally, inheritance is used in all object oriented languages to define common behaviours. All the similar types extends a trait which defines the common behaviour.

Let's look at it with a simple example:

Assume that we have the common behaviour as *flying*. We will first define a trait with the method fly() and all the different types will extend the trait and provide the detailed implementation.

```scala
trait Flyable {
    def fly(): Unit
}
case class Bird(name: String, color: String) extends Flyable {
    override def fly(): Unit = println(s"[OOP] A bird `$name` is flying! ")
}
case class Aeroplane(make: String, airline: String) extends Flyable {
    override def fly(): Unit = println(
      s"[OOP] $airline is flying $make aeroplane"
    )
}
case class Starship(name: String, captain: String, magicWord: String)
      extends Flyable {
    override def fly(): Unit = println(
      s"[OOP] The starship `$name` goes into warp when Captain $captain says `$magicWord`"
    )
}
```

Let's define a method which uses this *Flayable*:

```scala
def letsFly(f: Flyable) = f.fly()
```

Now, we can invoke the method letsFly() with instances of *Bird*, *Aeroplane* or *Starship* without any problem.

## Duck Typing

In Scala, the concept of Duck Typing is known as *Structural Typing*.

Let's look at how we can implement Structural Typing/ Duck Typing for the above code.

We can re-write the same case classes in a different way to explain this concept:

```scala
case class Bird(name: String, color: String) {
    def fly(): Unit = println(s"A bird `$name` is flying! ")
}

case class Aeroplane(make: String, airline: String) {
    def fly(): Unit = println(s"$airline is flying $make aeroplane")
}

case class Starship(name: String, captain: String, magicWord: String) {
    def fly(): Unit = println(
      s"The starship `$name` goes into warp when Captain $captain says `$magicWord`"
    )
}
```

The case classes *Bird*, *Aeroplane* and *Starship* all have a method *fly()* with exact same signature. Instead of using Inheritance, let's use the structural typing to invoke them.

Let's define the method *letsFly()* which was also shown in the previous case:

```scala
def letsFly[T <: { def fly(): Unit }](obj: T): Unit = obj.fly()
```

Here, the method signature takes a structural type which defines the method *fly()*. This means, we can invoke this method with any types which implements the method *fly()* with the same signature. So we can invoke the method successfully like below:

```scala
val bird = Bird("Eagle", "Grey")
letsFly(bird)
val aeroplane = Aeroplane("Airbus", "Lufthansa")
letsFly(aeroplane)
val starship = Starship("Enterprise", "Picard", "Engage")
letsFly(starship)
```

This approach is applicable even to *val*. Let's look at a slightly different approach, using the same structural typing.

Let's define a method as below:

```scala
def printName[A <: {val name: String}](obj: A) = println("The name from the object is : "+ obj.name)
```

We can invoke the method printName() for any type that define *name*. For example, let's define two completely unrelated case classes:

```scala
case class Country(name: String, code: String)
case class Person(name:String, dob: LocalDate)
```

Let's invoke the method *printName()* as:

```scala
val india = Country("India", "IN")
val sachin = Person("Sachin", LocalDate.parse("1973-04-23"))
printName(india)
printName(sachin)
```

In the same way, we can also create a type alias:

```scala
type NameLike = {
    val name: String
}
```

Define a function as:

```scala
def printName(obj: NameLike) = {
    println("Name is : " + obj)
}
```

We can invoke *printName()* with any type that has the field *name*. For example, we can use the same variables *india* and *sachin*:

```scala
printName(india) 
printName(sachin)
```

\*\**Note*: The structuring Type uses reflection to handle this *magic*. That means, there will be runtime overhead if this is used extensively or in intensive operations. \*\*

## Type Classes

The same behaviour can be implemented in another way using Type Classes. This is better and more safer than the Duck typing approach as there is no runtime reflection involved. Let's try to re-write the same logic using Type classes this time.

Firstly, we can define the case classes:

```scala
case class Bird(name: String, color: String)
case class Aeroplane(make: String, airline: String)
case class Starship(name: String, captain: String, magicWord: String)
```

Then we can define the type classes:

```scala
trait CanFly[A] {
    def fly(obj: A): Unit
}
```

Next, we can provide the implementations for out types:

```scala
implicit val birdFly: CanFly[Bird] = new CanFly[Bird] {
    def fly(bird: Bird): Unit = println(s"[TC] A bird `${bird.name}` is flying")
}

implicit val aeroFly: CanFly[Aeroplane] = new CanFly[Aeroplane] {
    def fly(a: Aeroplane): Unit = println(
      s"[TC] ${a.airline} is flying ${a.make} aeroplane"
    )
}

implicit val starshipFly: CanFly[Starship] = new CanFly[Starship] {
    def fly(s: Starship): Unit = println(
      s"[TC] The starship `${s.name}` goes into warp when Captain ${s.captain} says `${s.magicWord}`"
    )
}
```

At last, we can define the *letsFly()* method:

```scala
def letsFly[A](obj: A)(implicit c: CanFly[A]): Unit = c.fly(obj)
```

Now, we can invoke the method for all three case classes using the type class approach:

```scala
val bird = Bird("Eagle", "Grey")
letsFly(bird)
val aeroplane = Aeroplane("Airbus", "Lufthansa")
letsFly(aeroplane)
val starship = Starship("Enterprise", "Picard", "Engage")
letsFly(starship)
```

## Conclusion

In this blog, we looked at Inheritance, Duck Typing and Type Classes to define and invoke methods in a generic way. The sample code used here is available in [GitHub](https://gist.github.com/yadavan88/956ddc63b81f4509bc9dbc7d381b23e6).
