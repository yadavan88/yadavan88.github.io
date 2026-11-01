---
title: "Custom SBT Task to List Direct Dependencies of a Project"
pubDatetime: 2024-07-02T16:11:39.000Z
description: "Recently, at work, there was a requirement to list out the direct dependencies of the our SBT project, something like Bill Of Materials."
tags:
  - "build-tool"
  - "scala"
  - "sbt"
ogImage: "/images/posts/custom-sbt-task-to-list-direct-dependencies-of-a-project/ebb59ea3-0d6e-4891-b20d-fe0e8d18c8b3.jpeg"
---
## Introduction

Recently, at work, there was a requirement to list out the direct dependencies of the our SBT project, something like Bill Of Materials.

[SBT](/posts/unlocking-the-power-of-sbt-a-beginners-guide-to-understanding-not-so-common-features/) itself provides the dependencies as list or tree or searchable HTML page using the built-in commands such as `dependencyList` , `dependencyTree` and so on. Similarly, the GitHub also provides a SBOM option to download all the dependencies list.

However, since they provide dependencies including transitive ones, it was not what I was looking for. So, with the help of my colleagues, we wrote a simple custom sbt task to get the details. There might have been some other approaches available, but I wanted to get this quickly without a lot of research :)

## Requirement

As you might already know, we can write custom tasks in SBT to perform tasks or retrieve build related information.

We can write any file with extension `.sbt` and place it in the main root directory. On sbt load, all the `.sbt` files will be loaded and available for execution.

We can get the information of direct dependencies using the command `sbt libraryDependencies` . But this prints the information directly into console as a text data. However, we want to process and filter the data as per our requirement.

At the end, we want to generate a markdown file that contains the list of libraries and their version. Also, it should have separate tables for main dependencies and test dependencies.

## Implementation

There are multiple modules and not all the modules are aggregated in the main root project. As a result, we need to get the dependencies from each sub module and aggregate them into the resultant output.

Let's write the custom task for this:

```scala
import sbt.*
import Keys.*
import scala.collection.mutable.ListBuffer

lazy val generateDeps = taskKey[Unit]("Generates direct library dependencies of the project")
generateDeps := Def.taskDyn {

  def formatAsMarkdownTable(
      artifacts: Seq[(String, String, String, Option[String])]
  ): String = {
    val header = "| Group ID | Artifact ID | Version |\n| --- | --- | --- |"
    val rows = artifacts
      .groupBy { case (groupId, artId, version, _) =>
        s"| $groupId | $artId | $version |"
      }
      .keys
      .toSeq
      .sorted
    (header +: rows).mkString("\n")
  }

  val projectRefs: Seq[ProjectRef] = loadedBuild.value.allProjectRefs.map(_._1)
  val dependencies: ListBuffer[(String, String, String, Option[String])] =
    ListBuffer.empty
  Def
    .sequential {
      projectRefs
        .map { projectRef =>
          Def.task {
            val allDeps =
              (projectRef / libraryDependencies).value.sortBy(_.organization)
            allDeps.map { dep =>
              val configurations = dep.configurations
              val res =
                (dep.organization, dep.name, dep.revision, configurations)
              dependencies.append(res)
              res
            }
          }
        }
    }
    .map { _ =>
      val mainDeps = dependencies.filter(_._4.isEmpty).sortBy(_._1).distinct
      val testDeps = dependencies.filter(_._4.nonEmpty).sortBy(_._1).distinct
      val mainDepsTable = formatAsMarkdownTable(mainDeps)
      val testDepsTable = formatAsMarkdownTable(testDeps)
      val markdownContent = s"""# List of direct dependencies
                             |
                             |This document lists all direct dependencies of the project.
                             |
                             |## Main Libraries
                             |
                             |$mainDepsTable
                             |
                             |## Test Libraries
                             |
                             |$testDepsTable
                             |
                             |""".stripMargin

      val file = new File("directDependencies.md")
      IO.write(file, markdownContent)
      ()
    }
}.value
```

We wrapped the entire implementation in `Def.taskDyn`. This allows to create a dynamic task. Since we are iterating through the modules and generating the dependencies list, we need to make use of dynamic task as it is not known at the compile time.

We can get the list of defined sbt modules using `loadedBuild.value.allProjectRefs`.

Iterating through each of the modules, we use the Def.task to create a task that uses the `projectDependencies` to get the list of dependencies in each module. We can extract the value of the `projectDependencies` task by using the `value` method. Then we can extract the required information such as artifactId, groupId, scope and so on.

Notice that we used `Def.sequential {}`. Since we are creating a task per module dynamically, we need to use the `sequential` method to execute them one by one. *<mark>Please note that I could't find a way to collect the results from each of the tasks, so I used a mutable ListBuffer to store this info from each task</mark>*<mark>.</mark>

Once that is available, we can simple format in the way we want it and write to a a file. If we want we can even add this task to the sbt load to generate on every load of sbt:

```scala
lazy val generateDepsTask: State => State = { s: State =>
  "generateDeps" :: s
}
Global / onLoad := {
  val previous = (Global / onLoad).value
  generateBomTask.compose(previous)
}
```

May be there is a simpler way to do this, please comment if there is a better way for this.

## Conclusion

This SBT task can generate the list of direct dependencies. SBT is very powerful, however, it is a bit tricky to understand and do advanced stuff with it.

Hope someone will benefit from reading this.

The sbt code and the generated sample dependencies markdown file is [available here](https://github.com/yadavan88/blog-code-samples/tree/main).
