# Contributing

## The gates

```bash
npm run typecheck && npm run lint && npm run lint:prose && npm test
```

All four run in CI on every push and pull request. `lint:prose` is the house rule that an em dash is never used as punctuation; it is a gate rather than a note because a rule nobody checks drifts.

## The rules the geometry has to keep

A change to `src/lib/geom` or `src/lib/tag.ts` has to leave these true, and the tests say so:

- every part is a closed surface, with `openEdges` empty
- normals point outwards, so the signed volume is positive
- nothing of the body reaches above the change height, and nothing of the code below it
- two builds of the same tag produce identical bytes

If you change how a mesh is built, open the result in a slicer before you open the pull request, and say in the description which slicer and which version.

## Numbers in prose

Any number in the README, in a comment or in a commit message is one that was measured. If it was estimated, say so, or leave it out. `VERIFY-LOG.md` is where measurements live, with the tool and the version that produced them.

## Adding a shape

One entry in `src/lib/layouts.ts`, which answers four questions: the outline, the holes, where the code may go and where text may go. Everything else follows from it, including the laser file and the preview. Add the shape to `SHAPES` and the existing tests will cover it.

## Commit messages

Type prefix, lowercase after it, and say what was wrong rather than what you touched.

```
fix: the colour change landed mid layer on 0.16 mm profiles
```
