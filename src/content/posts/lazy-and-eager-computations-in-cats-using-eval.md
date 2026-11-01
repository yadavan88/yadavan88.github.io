---
title: "Lazy and Eager Computations in Cats using Eval"
pubDatetime: 2022-09-18T09:26:22.000Z
description: "Controlling evaluations in Cats using Eval"
tags:
  - "scala"
  - "functional-programming"
ogImage: "/images/posts/lazy-and-eager-computations-in-cats-using-eval/jM6HJK39J.jpg"
---
> Unleash the potential of Cats Eval, a specialized monad that streamlines synchronous evaluations and harmonizes diverse code types. In this write-up, we'll delve into the numerous benefits of Cats Eval, including its ability to regulate code execution by facilitating eager evaluation, delaying execution, and caching chains. Additionally, we'll demonstrate how this can effectively prevent StackOverflow exceptions.

## 1. Introduction

While building software, we might need to perform some of the actions immediately, whereas some are better to be delayed to execute later for better performance. We can control the executions in Scala by using *val*, *lazy val* and *def*. However, it is not possible to generalize these different evaluations easily.

This is where Cats [*Eval*](https://typelevel.org/cats/datatypes/eval.html) comes to help. Eval helps to control the synchronous evaluations and handle all the different types in the same way. In this short blog, let's look at the Eval Monad in Cats and how to use it.

## 2. Eval

Eval supports the evaluation in 3 ways:

* **Lazy evaluation**: Evaluated only when explicitly invoked, and caches(memoizes) the result after the first invocation. This is similar to *lazy val*.
    
* **Eager evaluation**: Evaluates the statement immediately on reaching, then caches the result (similar to *val*)
    
* **Always evaluation**: Invokes the block **everytime** when encountered, also will *NOT* cache the results (similar to *def*)
    

**Eval provides stack safety using *trampolining*. Trampolining moves the computation from stack to heap space**. This way, we can avoid getting StackOverflow exceptions while using Eval. You can read more about trampolining [here](https://free.cofree.io/2017/08/24/trampoline/) and [here](https://medium.com/@olxc/trampolining-and-stack-safety-in-scala-d8e86474ddfa).

Since Eval is a monad, we can also chain the eval operations using map, flatMap, and for-comprehensions.

## 3. Setup

Let's add the cats library dependency to build.sbt as:

```scala
libraryDependencies += "org.typelevel" %% "cats-core" % "2.8.0"
```

## 4. Lazy Evaluation

To get lazy evaluation, we can use the method `later` on Eval:

```scala
val lazyNumber: Eval[Int] = Eval.later {
  println("This is a lazy evaluation")
  100
}
```

This will make the variable `lazyNumber` to be lazily evaluated. Unlike *lazy val*, a *Later Eval* will NOT be evaluated at the time of encounter. What that means is that, even if we have a statement as below, it will still not evaluate the *later* block:

```scala
println(lazyNumber)
```

To evaluate it, we need to invoke `.value` method on the Eval instance as:

```scala
println(lazyNumber.value)
```

This will evaluate the block and store (memoize) the value in the `lazyNumber` and returns the value from the Eval instance. When we use it next time, it will NOT execute the block as the value is already memoized in the variable. Hence, subsequent invocation of `lazyNumber.value` will just return the previously stored value immediately.

***The*** `lazy val` ***locks the entire class to ensure thread-safety. However,*** `Eval.later` ***only locks itself, which is better performing.***

## 4.Eager Evaluation

We can create an eagerly evaluating Eval by using the method *now*.

```scala
val eagerNumber: Eval[Int] = Eval.now {
  println("This is an eager number")
  50
}
```

As soon as the runtime encounters this variable, the block will be executed and the value will be memoized in the variable, even without invoking `value` method. If we use the same variable again, it will just return the memoized value and will not evaluate the block again.

## 5. Evaluate every time

We can use `Eval.always` to evaluate the block every time that is encountered. This method uses lazy evaluation, but no memoization is involved. This is similar to *def* in Scala. However, since this is lazy, we need to invoke `.value` explicitly to evaluate the block. Otherwise, it will just create the Eval data structure without actually evaluating the block.

```scala
val alwaysNumber = Eval.always {
  println("This is evaluated each time invoked.")
  0
}
println(alwaysNumber.value)
println(alwaysNumber.value)
```

The above code will print the *println* statement twice.

## 6. map and flatMap

Eval's map and flatMap methods also evaluate lazily. Also, the trampolining is applied on both of them making it stack safe. Let's look at an example:

```scala
val lazyStr1 = Eval.now {
    println("Evaluating lazy string 1")
    "Cats Eval"
}
val lazyStr2 = Eval.now {
    println("Evaluating lazy string 2")
    " is awesome"
}
val combined = lazyStr1.flatMap { l1 =>
    println("inside the flatMap")
    lazyStr2.map(l1 + _)
}
println(combined)
```

Note that, since we have used `Eval.now` to create eval instances, they will be immediately evaluated(eager). However, when we execute the above code, we can notice that the println statement inside the flatMap method is not printed. Also, the `combined` result is also not evaluated. To evaluate the `combined` variable and hence the map-flatMap, we need to invoke `.value` on it:

```scala
println(combined.value)
```

Now, the flatMap block is evaluated and the print statement is printed to the console.

**Since map and flatMap methods are available for Eval, we can also use for-comprehension like any other monad on Eval as well.**

## 7. Defer

Sometimes, we need to delay the block which produces an Eval result. We can do that by using `Eval.defer`. Let's look at a simple example which shows the difference. We can use (overused :P ) factorial example:

```scala
def factorialEval(x: BigInt): Eval[BigInt] = if (x == 0) {
  Eval.now(1)
} else {
  factorialEval(x - 1).map(_ * x)
}
```

If we try to invoke this method for a very big number, we will still get StackOverflow exception.

```scala
factorialEval(50000).value
```

This is because the method that produces the eval will still create multiple levels in the stack. We can avoid it by using `Eval.defer`:

```scala
def factorialEval(x: BigInt): Eval[BigInt] = if (x == 0) {
  Eval.now(1)
} else {
  Eval.defer(factorialEval(x - 1)).map(_ * x)
}
```

The only difference is the use of `defer` method, which moves the execution from stack to heap space and hence avoids the StackOverflow issues. We can see the stack level easily by adding the below println statement within the `else` block. You can see how the number of stacks increases in the first example, whereas the number stays very low even for a high number:

```scala
println("Level: " + Thread.currentThread().getStackTrace().length)
```

## 8. Memoizing Chains Explicitly

As we discussed before, we can use the map and flatMap methods to chain many Eval operations. If we have a set of chained operations which might not change, we can apply memoization on those parts of the chain explicitly to improve the performance. Let's look at an example:

```scala
val longChain: Eval[String] = Eval
  .always { println("We are in Init Step"); "Init Step" }
  .map { s => println("We are in Step 2"); s + ", Step 2" }
  .map { s => println("We are in Step 3"); s + ", Step 3" }
  .map { s => println("We are in Step 4"); s + ", Step 4" }
```

Now, let's evaluate the chain:

```scala
println(longChain.value)
```

This will print the steps information to the console since the `map` block is evaluated each time. Now, let's invoke the same chain multiple times:

```scala
println(longChain.value)
println(longChain.value)
println(longChain.value)
```

This will show the output as:

![image.png](/images/posts/lazy-and-eager-computations-in-cats-using-eval/O4baUPojH.png)

You can see that the print statements are executed 3 times. We can `memoize` any part of the chain to cache the result. Let's apply memoize in Step 3:

```scala
val longChain: Eval[String] = Eval
  .always { println("We are in Init Step"); "Init Step" }
  .map { s => println("We are in Step 2"); s + ", Step 2" }
  .map { s => println("We are in Step 3"); s + ", Step 3" }.memoize
  .map { s => println("We are in Step 4"); s + ", Step 4" }
```

Now, we can execute the same print statements as before:

```scala
println(longChain.value)
println(longChain.value)
println(longChain.value)
```

![image.png](/images/posts/lazy-and-eager-computations-in-cats-using-eval/CehFvNI7h.png)

We can see that the steps before `memoize` is executed only once and step 4 is executed every time.

## 9. Conclusion

In this article, we looked at the `Eval` monad from *Cats* and how it can help to control the execution. The code sample used here is available on [GitHub](https://github.com/yadavan88/blog-code-samples/tree/main/cats/src/main/scala/com/yadavan88/evals).
