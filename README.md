# Fundus Grading Application

This project aims to build an application to grade an input fundus. Generally, a fundus image normally need to be graded by:
    - Gradability (usable or not usable)
    - Center Area (Disc-centered or Macular-centered)
    - Eye site (Right eye or left eye)

Therefore, three individual model was trained and compressed in Tensorflow Lite. Then we built an integrated application to use all models. The model workflow looks like:
```
Input fundus -- Gradability Model ---If UNGRADABLE--- RETURN ungradable
                       |
                IF GRADABLE
                       |
                       |--- Center Area Model --- |
                       |                          | --- RETURN grdable, center area, eye site
                       |--- Eye Site Modle ---    |
```

## Project Structure
- app -- The application.
- training -- The deep learning.

## Screenshot
![screenshot](./app/imgs/sc.png)