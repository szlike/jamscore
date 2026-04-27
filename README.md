# MusicXML Song Viewer (React + VexFlow)

This app lets a user:

1. Enter a song name.
2. Request a MusicXML score from an API.
3. Render the returned MusicXML with VexFlow.

## Run

```bash
npm install
npm run dev
```

## API contract

By default, the app requests:

`/api/musicxml?song=<songName>`

Set a custom endpoint in `.env`:

```bash
VITE_MUSICXML_API_URL=https://your-api.example.com/musicxml
```

The endpoint should return MusicXML text in `score-partwise` format.

## Local test score

Click the `Sample` button to load `/public/sample.musicxml` and verify rendering without a backend.
