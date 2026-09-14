# Classes

Sunday School is taught in classes, and each class is taught different
material. This product is therefore not one curriculum with an age filter on
it — it is seven curricula that happen to share a companion.

The whole of this document follows from one sentence:

> **Class is part of a chapter's identity.** `Beginner / Chapter 01` and
> `Primary / Chapter 01` are different lessons that happen to share a number.

Nothing anywhere in the app may identify a chapter by its slug alone.

---

## The seven

`content/classes.json` is the only list, and `src/classes/registry.ts` is the
only way to read it. Canonical Sunday School names, youngest to oldest:

| id | display | |
|---|---|---|
| `nursery` | Nursery | |
| `beginner` | Beginner | the only class with chapters today |
| `primary` | Primary | |
| `junior` | Junior | |
| `intermediate` | Intermediate | |
| `senior` | Senior | |
| `young-adult` | Young Adult | |

**The names carry no ages, and must not.** Which age band sits in which class
is a fact about a congregation, not about this library, so nothing renders
"Beginner (5–7)".

**An id is set once and never edited.** It names a Drive folder, a brief file,
a content directory, a route segment and every progress key a child
accumulates. Renaming one orphans all five at once. The display name is free
to change whenever a congregation asks.

`live` in that file is an **editorial** flag — whether a class's sheet tab and
brief are being maintained. It deliberately does not reach the class picker.
All seven are always choosable; see *Choosing* below.

---

## Where a chapter lives

```
content/
├── classes.json
├── library.json                    entries are "class/slug"
├── brief/
│   └── beginner.json               one editorial brief per class
└── beginner/
    ├── baby-jesus-at-the-temple.story.json
    └── wedding-at-cana.story.json

public/art/
└── beginner/
    ├── baby-jesus-at-the-temple/
    └── wedding-at-cana/
```

Three rules the build enforces, each of them a way this has a cheap failure
mode and an expensive one:

- **The directory must be one of the seven.** `content/beginners/` with the
  stray s loads cleanly, builds cleanly and is reachable by nobody, because
  no child can be in a class that does not exist. It fails the build instead.
- **The file must declare its own class**, and it must match the directory it
  is in. They are two statements of one fact, and a file dropped into the
  wrong folder is how a Primary lesson silently becomes a Beginner one.
- **`library.json` names `class/slug`.** A bare slug could not say which of
  two `wedding-at-cana` chapters ships.

Adding a chapter is still a content-only change. Adding a whole *class* of
chapters is also a content-only change: drop `content/primary/` in and it
loads, routes, and appears for every child who says they are in Primary.

---

## Where a chapter is reached

```
/chapter/<class>/<slug>
/chapter/<class>/<slug>/story
/chapter/<class>/<slug>/games
/chapter/<class>/<slug>/games/<game>
/chapter/<class>/<slug>/verse
/chapter/<class>/<slug>/verse/practice
/chapter/<class>/<slug>/watch
```

**The class is in the URL, not read from the device.** An address is a promise
about *which* content: a link shared between two children on one iPad has to
open the same lesson for both of them, and a chapter page should never have to
wait for `localStorage` before it knows what to render.

`chapterHref()` in `src/content/key.ts` is the one place a chapter URL is
spelt. `chapterKey()` beside it is the one place `class/slug` is spelt for
storage. Nothing else in the codebase builds either by hand.

---

## Where a chapter is *chosen*

The four destinations — Home, Chapters, Games, Memory Verse — keep stable
URLs, because the tab bar has to be drawable before anything has been read
from the device. So they cannot have the class in their path, and there is no
server at runtime to bake it in.

Each of those pages therefore ships **one small projection per class** and the
browser picks one out of it, through `byClass()` on the server and `useMyClass()`
in `src/components/class/InClass.tsx`. What crosses into the bundle is
whatever that screen actually draws — a title, a reference, a cover path —
never the chapters themselves.

The cost is honest: seven classes of twenty chapters is seven lists where one
would do. The alternative was a class in the URL of every destination, which
would mean a tab bar that arrives late. A few kilobytes is the cheaper of the
two, and the exit — per-class destination routes — is a local change to those
four pages if the arithmetic ever stops working.

### `settled` is not the same as `null`

`useResolvedClass()` returns both the class and whether the device has been
read yet, because `null` otherwise means two different things for one frame:
*no class* and *not looked yet*. A screen that cannot tell them apart either
flashes a question at a child who has already answered it, or flashes one
class's chapters at a child who is in another. Both were real. Nothing
class-dependent draws until `settled`.

---

## Choosing

**One selector, three homes.** `src/components/class/ClassSelector.tsx` is
used by onboarding, by Home and by Settings. A child who chose from a friendly
grid on Sunday and meets a dropdown on Wednesday has been asked a subtly
different question, and three implementations are three chances for one of
them to forget that choosing is a write everything else must hear about.

**All seven are always offered**, including the six with nothing written. A
child in Junior is in Junior whether or not anyone has finished writing
Junior; a picker that hid the class would make them claim to be something they
are not in order to get past the screen. A class with no chapters lands on an
honest empty state, which is a much smaller problem than a wrong answer stored
forever.

**There is no default and no way past it.** Guessing hands a six-year-old
somebody else's lessons, and "Beginner" is not a sensible fallback merely
because it is the class that has content today.

### The three doors of `/`

`DOORWAY_SCRIPT` runs before anything paints and sets one attribute; the
stylesheet does the rest, so the first frame is already the right screen.

| `data-welcomed` | screen | who |
|---|---|---|
| `yes` | Home | welcomed, and has a class |
| `class` | the class question alone (`AskClass`) | welcomed before classes existed |
| `no` | the whole welcome (`Welcome`) | never met Halo |

The middle one is a screen rather than a starting step inside `Welcome`, and
that is a hydration decision as much as a design one: the static HTML is built
with the first beat in it, so a client opening on a different beat would
either disagree with the markup it is hydrating or flash the first beat on the
way past. A third branch has neither problem.

Inside onboarding proper, the class is beat 4 of 5 — after the name, before
"ready". It is asked as part of the meeting, in Halo's voice, because it is
not a setting: it decides which curriculum exists at all, and the app has no
honest first screen until it is answered. Choosing is the advance, so that
beat has no button.

---

## Switching, and what it costs

**Nothing.** That is a promise the storage layout keeps rather than one the
wording makes.

```
ssc.class                       which class. Not itself scoped — it is the scope.
ssc.place.<class>               where they were, per class
ssc.games.streak.<class>        momentum, per class
ssc.verse.streak.<class>        momentum, per class
ssc.session.chapters            keyed "class/slug", per sitting
ssc.child, ssc.welcomed, ssc.settings    not class-dependent
```

Switching changes which keys are read and touches none of the others. A child
who moves Beginner → Primary → Beginner finds their place, their streaks and
their sitting exactly as they left them. Both surfaces that offer the switch
say so, because a child who fears losing their progress will never touch it.

A streak is per class for the same reason a place is: a streak is built on a
particular set of questions. Carrying a Beginner streak into Primary would
credit a child for work they did on different material; resetting it on every
switch would punish them for changing class. Neither is true.

"Clear progress" in Settings still clears everything, including the class —
which is right, because it also clears `welcomed`, so onboarding asks again.
It scans for the `ssc.` prefix rather than walking a list, since a list cannot
enumerate keys that are created per class.

---

## Empty classes

Six of the seven are empty today, so this is the ordinary case and not an
error. Every destination says whose shelf is empty:

- **Home** — "Your class's stories are on their way."
- **Chapters** — "Primary stories are on their way", plus where to change it.
- **Games / Memory Verse** — the screen still names itself and says there is
  nothing yet.

Naming the class matters: an unqualified "stories are on their way" leaves a
child who picked the wrong class waiting for chapters that are already there
under another name.

---

## Development

`/debug` shows every class at once — it is the pipeline's view, and the one
place in the app where that is the truth. It carries a class switcher that is
**compiled out of production builds**: `process.env.NODE_ENV` is replaced with
a literal, so the branch is dead code and the bundler drops it. It is not
hidden by CSS and not behind a flag; it is not there.

---

## Things this is not

- Not three separate builds, apps or deployments. One app, one content layer.
- Not an account. There is no login, no profile, no server-side anything —
  the class is a word in `localStorage` on one device.
- Not visible curriculum machinery. A child sees "Beginner", never a Drive
  folder name, a sheet tab, a chapter key or the word "curriculum".
