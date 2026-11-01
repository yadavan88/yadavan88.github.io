---
title: "Self Type in Scala"
pubDatetime: 2022-06-10T16:00:00.000Z
description: "Different usages of self types in Scala"
tags:
  - "scala"
  - "functional-programming"
  - "cake-pattern"
  - "scala-basics"
ogImage: "/images/posts/self-type-in-scala/tFuzy5xIc.jpg"
---
## Introduction
**Self Types** are a way of specifying the dependencies for a class/trait in Scala. Using this, the compiler can enforce to provide the required dependencies while instances are created. This is widely used in Scala, especially in cake pattern. 

The same “self” type can be used for a different scenario as well. In this short article, I will try to explain the difference between these two approaches. 

## Self Type as Dependency
In general OOPs programming, we declare traits and classes and they are extended with others to build hierarchy. Using self-types, we can instead define dependencies and the implementor is free to choose the required traits to mix-in. 

Let's look at it with an example. 

```scala
trait Vehicle {
  def wheels: Int
}

trait Truck { self: Vehicle =>
  def drive: Unit = println(s"I am driving a truck with $wheels wheels!")
}

``` 
In the above code sample, the trait `Truck`  has a self type `Vehicle`. Here, the trait *Truck* is not extending with Vehicle. Rather it means that, if we want to create an instance of *Truck* somewhere, we must mix-in with *Vehicle* or any of its sub types, wherever that is. 

It is not necessary to use the name `self`, we can use any variables, for example, `foo` or `this` instead. 

Also note that, **within *Truck*, we can access the fields and methods from *Vehicle* even though we are not extending with it. **
So, when we need to create a concrete type of the *Truck*, we can do as:


```scala
class MiniTruck extends Truck with Vehicle {
  def wheels: Int = 4
}
``` 
If we extend only with *Truck*, we will get a compilation error message for `Illegal Inheritance: does not conform to self type`.

This style of approach is used to build [Cake Pattern](https://www.baeldung.com/scala/cake-pattern). However, extensive use of cake pattern can cause problems when a lot of classes and traits are involved. 

## Self Type as Tagging
Another use of self type is to be used for tagging. Like in many languages, we can refer to the class/trait within itself using the keywork `this`. But when there is a nested structure, *this* within the nested trait will refer to the inner trait/class, and we can't access the *this* reference for the outer trait. 

In such cases, we can tag the outer instance in the same way as we do the self type, but without providing the type. 

Let's look at it with an example for better clarity:

```scala
trait Descriptor { outer =>
  val name = "Outer"
  def desc = s"[$name] Description"
  def instance = new Descriptor {
    override val name = "Inner"
    override def desc = outer.desc + s", Name: '${this.name}' with Inner Description"
  }
}
``` 
In the above example, we are creating an instance of the same type within the outer trait *Descriptor*. Within the anonymous trait, the keyword *this* will refer to the fields of the nested trait only. We have lost the reference of the outer *Descriptor* trait there.

But, in the above code, the outer trait is tagged with a reference `outer =>`. Now we can access the outer trait fields within the anonymous trait instance using the tag `outer`. Similar to self, **we can use any variable name to tag the instance**. 

## Conclusion 
In this short article, we have looked at different styles of self type in Scala. The differences might look very confusing for a newcomer to Scala. I hope that this will be useful to some of you.
