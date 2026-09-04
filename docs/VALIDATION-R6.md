# QuietShield Chrome 1.0.5 R6 Validation

R6 retains the R5 functional blocker/UI runtime and changes the publisher reliability path.

Required release gates:

- Manifest V3 parses and reports version 1.0.5.
- All bundled JavaScript passes syntax validation.
- All DNR JSON rulesets parse, use unique rule IDs, and use Chrome-supported resource types.
- Every manifest-referenced local runtime path exists.
- No remote executable code is present in extension runtime files.
- Publisher contains exactly one root BAT and one scripts/PS1.
- BAT creates an external persistent log before mutation.
- BAT pauses after success and failure.
- PS1 uses Start-Transcript and reports error position/stack.
- PS1 does not recursively invoke the canonical BAT.
- LOAD-UNPACKED is still generated at the canonical project root.

Windows PowerShell 7 parser/runtime must execute on the target Windows machine.
