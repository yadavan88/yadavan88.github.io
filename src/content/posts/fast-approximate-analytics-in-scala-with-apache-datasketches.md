---
title: "Fast Approximate Analytics in Scala with Apache DataSketches"
pubDatetime: 2026-10-31T19:56:29.538Z
description: "Learn HLL, KLL and Frequent Items sketches in Scala with Apache DataSketches, and inspect stored sketches with SketchProbe."
tags:
  - "data-analysis"
  - "scala"
  - "cli"
  - "apache"
  - "datsketches"
ogImage: "/images/posts/fast-approximate-analytics-in-scala-with-apache-datasketches/efcd207b-a038-4b5a-940b-776352158490.png"
---
[Apache DataSketches](https://datasketches.apache.org/) is an open-source library of probabilistic algorithms designed for fast, streaming data analysis with sub-linear memory usage.

While this post uses **Scala** (running on the JVM), DataSketches also offers official or community-supported implementations for **Java**, **C++**, **Python**, and **Rust**, making it a great fit for polyglot systems.

> **Version Note:** For these examples, we use **DataSketches 6.x**, which is fully compatible with **JDK 21**. Newer versions (like 8 or 9) require **JDK 25+**, so check your runtime environment before upgrading.

## Why Use DataSketches Instead of Standard Collections?

When handling stream analytics, it's tempting to reach for standard Scala structures like a `Map[String, Long]` to count item frequencies or a `Set` to track unique users. However, standard collections run into walls at scale:

1. **Memory Explosion:** A standard map or set grows linearly (*O(N)*) with cardinality. Tracking millions of unique API users or IP addresses quickly leads to OutOfMemory (OOM) errors. Sketches maintain a fixed, predictable byte footprint regardless of ingestion volume.
2. **Merging Time Windows:** In stream processing (like Kafka or Spark), data is often split into hourly or daily partitions. If you want a 7-day rolling unique count from daily exact sets, you can't just add their sizes together because of overlaps. Sketches solve this: you store a small sketch per time window and simply merge them (`sketch1.merge(sketch2)`). The internal algorithm handles duplicate deduplication automatically.

## Storage, Base64, and Binary Formats

Sketches are stored in databases or sent across Kafka as **compact binary byte arrays** (via `sketch.toByteArray()`).

Because they are binary blobs, you can't understand them easily. When debugging or displaying them, it's common to encode them as **Base64 strings** to easily pass them around text logs or JSON APIs. To get actual metrics, your application must deserialize the binary blob back into a sketch object and call calculation methods like `.getEstimate()` or `.getQuantile()`.

## A Quick Note on Accuracy

Because sketches are probabilistic, they don't give 100% exact numbers; they trade a tiny, bounded margin of error for massive memory and speed gains. You might see minor estimation deviations or bounded false positives in frequency counts, but errors are strictly governed by your configuration settings (like `lgK`).

## Sketch Types Overview

- **HLL (HyperLogLog):** For distinct count estimation.
- **Items (Frequent Items):** For tracking top-K elements.
- **KLL (Quantiles):** For tracking rank distributions and percentiles (like p99 latency).
- **Theta / Tuple / Sampling:** Used for set operations and random stream sampling.

## Scala Code Examples

Now look at some code examples to read and write these sketches. We are using the Java library in Scala code for samples. Note that the examples are too simple to make it easier to explain.

### 1. Unique IP Counts with HLL (`lgK` and `HLL_4`)

`lgK` (log base 2 of K) controls the accuracy vs. memory trade-off (e.g., `lgK = 12` gives K = 4096). `HllSketch` with `HllType.HLL_4` uses a compressed 4-bit layout to minimize memory usage even further.

```java
import org.apache.datasketches.hll.{HllSketch, TgtHllType}
import java.util.Base64

object HllExample {
  def main(args: Array[String]): Unit = {
    // lgK = 12, using compact HLL_4 target type
    val sketch = new HllSketch(12, TgtHllType.HLL_4)

    val ips = Seq("192.168.1.10", "10.0.0.1", "192.168.1.10", "172.16.0.5")
    ips.foreach(sketch.update)

    println(s"Estimated unique IPs: ${sketch.getEstimate}")
    println(s"Lower bound (95% confidence): ${sketch.getLowerBound(2)}")
    println(s"Upper bound (95% confidence): ${sketch.getUpperBound(2)}")

    // Serialize to binary byte array and encode to Base64
    val bytes = sketch.toCompactByteArray
    val base64String = Base64.getEncoder.encodeToString(bytes)
    
    println(s"Serialized Sketch (Base64):\n$base64String")
  }
}
```

### 2. Frequency Tracking with Items Sketch (Size 1024)

The Items Sketch tracks high-frequency elements across streams using a nominal max capacity map size (e.g., `1024`).

```java
import org.apache.datasketches.frequencies.{ErrorType, ItemsSketch}
import java.util.Base64

object ItemsExample {
  def main(args: Array[String]): Unit = {
    // Nominal size set to 1024 capacity
    val sketch = new ItemsSketch[String](1024)

    val requests = Seq("DE", "IN", "US", "DE", "DE", "US", "FR", "DE")
    requests.foreach(country => sketch.update(country, 1L))

    val frequentItems = sketch.getFrequentItems(ErrorType.NO_FALSE_POSITIVES)
    frequentItems.foreach { row =>
      println(s"Country: ${row.getItem} | Estimate: ${row.getEstimate}")
    }

    // Print Base64 representation for storage or inspection
    val bytes = sketch.toByteArray(new org.apache.datasketches.ArrayOfStringsSerDe)
    val base64String = Base64.getEncoder.encodeToString(bytes)
    println(s"Serialized Items Sketch (Base64):\n$base64String")
  }
}
```

### 3. API Latency Percentiles with KLL (`p99`)

`KllDoublesSketch` streams numeric distributions and allows querying precise latency percentiles, such as median (`0.50`) and `p99` (`0.99`).

```java
import org.apache.datasketches.kll.KllDoublesSketch
import java.util.Base64

object KllExample {
  def main(args: Array[String]): Unit = {
    val sketch = KllDoublesSketch.newHeapInstance()

    val latenciesMs = Seq(12.5, 45.2, 102.1, 8.4, 215.0, 33.1, 55.0)
    latenciesMs.foreach(sketch.update)

    println(s"p50 Latency: ${sketch.getQuantile(0.50)} ms")
    println(s"p99 Latency: ${sketch.getQuantile(0.99)} ms")

    // Serialize to Base64
    val bytes = sketch.toByteArray
    val base64String = Base64.getEncoder.encodeToString(bytes)
    println(s"Serialized KLL Sketch (Base64):\n$base64String")
  }
}
```

### 4. Distributed Aggregation with Merging

The real power of DataSketches comes from **mergeability**. In distributed systems (such as multiple Akka actors, microservice pods, or Spark partitions), each instance can maintain its own isolated sketch. You can then aggregate these sketches without needing raw events or losing mathematical accuracy.

In this example, we simulate two independent time windows (or two separate servers tracking latencies) and merge them into a single unified distribution:

```java
import org.apache.datasketches.kll.KllDoublesSketch
import org.apache.datasketches.kll.KllDoublesSketchUnion
import java.util.Base64

object MergeExample {
  def main(args: Array[String]): Unit = {
    // Server 1 tracking API latencies (e.g., Hour 1)
    val sketchServer1 = KllDoublesSketch.newHeapInstance()
    Seq(10.0, 25.0, 50.0, 120.0).foreach(sketchServer1.update)

    // Server 2 tracking API latencies (e.g., Hour 2)
    val sketchServer2 = KllDoublesSketch.newHeapInstance()
    Seq(15.0, 30.0, 80.0, 350.0).foreach(sketchServer2.update)

    // Create a Union operator to merge the sketches
    val union = KllDoublesSketchUnion.builder().build()
    union.update(sketchServer1)
    union.update(sketchServer2)

    // Get the merged result sketch
    val mergedSketch = union.getResult

    println(s"Combined Total Stream Count: ${mergedSketch.getN}")
    println(s"Merged p50 Latency: ${mergedSketch.getQuantile(0.50)} ms")
    println(s"Merged p99 Latency: ${mergedSketch.getQuantile(0.99)} ms")

    // Serialize the merged result to Base64
    val base64String = Base64.getEncoder.encodeToString(mergedSketch.toByteArray)
    println(s"Merged KLL Sketch (Base64):\n$base64String")
  }
}
```

### Why This is Powerful

1. **Zero Raw-Data Transfer:** Instead of sending millions of individual latency measurements over the network to a central server, each node sends a tiny compressed sketch payload (a few kilobytes).
2. **Lossless Deduplication & Resiliency:** For HLL sketches, merging handles duplicate items seamlessly. For quantiles (KLL), merging preserves distribution ranks across arbitrary time windows (e.g., merging 24 hourly sketches to get a exact 1-day p99 latency estimate).

For sample code used in this article, you can refer to [this repository](https://github.com/yadavan88/blog-code-samples/tree/main/scala3/src/main/scala/com/yadavan88/datasketches).

## Debugging and Inspecting Serialized DataSketches Binaries with `sketchprobe`

When working with binary blobs in a database or Base64-encoded strings flowing through JSON payloads and logs, you can't read them directly during debugging. Trying to manually write one-off Java or Scala scripts just to deserialize and check an HLL estimate or a KLL percentile gets tedious fast.

To solve this, I built [`sketchprobe`](http://github.com/yadavan88/sketchprobe), a lightweight CLI utility designed to inspect serialized Apache DataSketches binaries instantly.

### Installation

You can find setup instructions and pre-compiled binaries in the GitHub repository: 👉 [**github.com/yadavan88/sketchprobe#install**](https://github.com/yadavan88/sketchprobe#install)

### Inspecting via Pipe (`pbpaste | sketchprobe`)

Because `sketchprobe` reads from standard input (stdin), you can easily copy a Base64 string to your clipboard and pipe it directly into the tool for a quick inspection.

For example, taking the Base64-encoded HLL sketch generated in our first example:

```shell
$ pbpaste | sketchprobe inspect --type hll
```

Which outputs the deserialized summary directly in your terminal:

```shell
[SketchProbe] Inspecting HllSketch...
- Family: HLL
- LgK: 12
- Target Type: HLL_4
- Estimate: 4.0
- Lower Bound (95%): 4.0
- Upper Bound (95%): 4.0
- Is Empty: false
- Serialized Size: 56 bytes
```

This saves time when validating stream outputs, checking Kafka message payloads, or verifying database records without needing to spin up a heavy debugging environment.

SketchProbe also has a [browser version](https://yadavan88.github.io/sketchprobe/) where you can paste a base64 or hex sketch and see its contents right away, with nothing to install and nothing uploaded.
