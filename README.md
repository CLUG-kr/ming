## Auto subtitle synchronization tool

Experiment data: https://clug-kr.github.io/ming/




## Requirements

 * node.js ^7.10
 * ffmpeg (for **extract-audio** command)
 * IBM Bluemix API username/password (for **recognize** command)

## Install Dependencies


```
$ npm install
$ npm install -g typescript ts-node # sudo if needed
```


## How to use

### 1. Extracting audio
`$ ts-node src/index.ts extract-audio video.mp4 -o audio.ogg`

### 2. Speech-to-Text

Currently, only ogg format is supported for the audio file, and recognize command requires to be set valid IBM Bluemix username/password settings on the environment variable.

`$ ts-node src/index.ts recognize audio.ogg  -o recognition_result.json`

### 3. Creating subtitle
`$ ts-node src/index.ts combine subtitle.srt recognition_result.json > fixed_subtitle.srt`
