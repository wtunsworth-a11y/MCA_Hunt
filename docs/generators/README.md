# Document generators

These Node scripts build the Word (`.docx`) documents in `docs/` from the app's
own `js/config.js`, so the printed materials stay consistent with the app.

## Regenerate

Requires the `docx` npm package once:

```bash
npm install docx
node docs/generators/student_setup.js         # -> docs/MCA_Hunt_Student_Setup.docx
node docs/generators/paper_questionnaire.js    # -> docs/MCA_Hunt_Paper_Questionnaire.docx
node docs/generators/interviewer_guide.js      # -> docs/MCA_Hunt_Interviewer_Guide.docx
```

Re-run after editing the species/tools/options in `js/config.js` (the paper form
and interviewer guide read from it), then commit the updated `.docx` files.
