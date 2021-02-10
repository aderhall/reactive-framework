# reactive-framework
A javascript framework with a similar API to React that leverages reactive programming to improve efficiency.

Reactive works by tracking the uses of "state" and "props" variables during render time, then replaying everything once the variable is changed. This avoids the need for diff-checking a virtual DOM, which can improve performance in large, complex applications.

Currently, every use of a state or props variable must be tracked manually. I might create a babel plugin to add these trackers automatically, converting valid declarative React code into reactive code.

Reactive only works with functional components. It implements hooks like useState to allow stateful behavior.
