---
title: "Scala Closures"
pubDatetime: 2022-04-14T21:04:21.000Z
description: "closure in scala"
tags:
  - "functions"
  - "closure"
  - "scala"
  - "scala-basics"
ogImage: "/images/posts/scala-closures/Wbo-4UIBv.png"
---
## 1. Introduction

Closure is a function that is dependent on some variable outside its scope, and which is not part of the arguments list. In this article, let's look at some of the related concepts and how closure can be defined in Scala.

## 2. Free Variable and Bound Variable

Bound variable is a variable that is defined and used as part of a function. The variable cease to exist when the function/method execution is completed. Let's look at it with an example:

```scala
def sum(v1:Int, v2:Int): Int = v1 + v2
```

In the code above, both the variables *v1* and *v2* are part of the method parameters and are used within the function *sum*. Outside the method *sum*, the variables *v1* and *v2* has no meaning/existence. In Scala, these variables will be allocated in the stack memory of the JVM.

In contrast, Free Variable is a variable which is defined outside the scope of the function where it is used. For example:

```scala
def multiply(num: Int): Int = num * factor
```

In the above code, the variable *num* is a bound variable in the method *multiply*. However, the variable *factor* is not part of the method signature, but still used within the method. That means, the variable *factor* is a free variable in the context of the method *multiply*.

## 3. Closure in Scala

Closure is defined as:

> A function object that captures free variables, and is said to be "closed" over the variables visible at the time it is created.

Let's look at in detail with the previous example:

```scala
def multiply(num: Int): Int = num * factor
```

In Scala, if we try to compile the above code sample, it will will compiler error. We need to define the value for the variable *factor*. That process of defining the function by providing the value for the free variable is called as *closing* and such function is called as *closure*.

## Why is it Important?

In Scala, the closures are very widely used in the core language semantics. Let's try to understand it with an example:

```scala
val list1 = List(1, 2, 3)
val list2 = List(10, 20)
list1.foreach { num1 =>
  list2.foreach { num2 =>
    println(s"$num1 * $num2 = " + num1 * num2)
  }
}
```

Look at the line which prints the multiplied value. That can actually be represented using closure as:

```scala
list2.foreach { num2 =>
    printMultiply(num2)
    def printMultiply(num2: Int) = {
        println(s"$num1 * $num2 = " + num1 * num2)
    }
}
```

Now, the method *printMultiply* is a closure with the free variable *num1* and it has the bound variable *num2*.

## How is the Memory Allocated?

Generally, the local variables are allocated in the Stack memory of the JVM. That means, when the execution of the method is completed, the stack is cleared. However, sometimes the free variables outlives the method where it is used. Scala is intelligent enough to understand this and hence the free variable is allocated within the heap space rather than the stack.

```scala
def multiplier(factor: Int) = (num:Int) => (num * factor)
```

Here, *multiplier* is a closure with free variable as *factor*. Now, let's *close* this function:

```scala
val tripler: Int => Int = multiplier(3)
```

*tripler* is a function which multiplies any given value by 3. The *multiplier* closure is closed with the value 3 for *factor*. That means, the variable *factor* which is part of the method signature is normally available in stack and will be cleared after the method is returned. However, when we invoke *tripler()* it still needs to get the value for the factor. Scala compiler will identify this and make sure to allocate that variable in heap space so that it is accessible when *tripler()* is invoked later.

## Conclusion

In this short article, we looked at closure and related terminologies.
