<script setup>
import {computed, onBeforeMount, onMounted, ref} from 'vue';
import {ElMessage} from "element-plus";

// const songs = [
//   { title: '歌曲1', artist: '艺术家1', cover: 'cover1.jpg', url: 'song1.mp3' },
//   { title: '歌曲2', artist: '艺术家2', cover: 'cover2.jpg', url: 'song2.mp3' },
//   { title: '歌曲3', artist: '艺术家3', cover: 'cover3.jpg', url: 'song3.mp3' },
// ];
const props = defineProps(['song'])

// const song = ref({
//   title: '歌曲1',
//   musician: '艺术家1',
//   cover: 'src/assets/img/logo.png',
//   url: 'src/assets/testMusic.m4a'
// }
// )

// const currentSongIndex = ref(0);
// 音量
const volume = ref(50);
// 进度
const position = ref(0);
// 总时长
const duration = ref(0);
const audio = ref();
// 歌单功能
// const currentSong = computed(() => songs[currentSongIndex.value]);
const isPlaying = ref(false)

const isDragging = ref(false)
// function playSong(index) {
//   currentSongIndex.value = index;
//   loadAudio();
//   playAudio();
// }

function loadAudio() {
  // if (audio) {
  //   audio.value.pause();
  // }
  // audio = new Audio(currentSong.value.url);
  // 把上一首歌暂停
  if (audio.value) {
    audio.value.pause();
  }

  audio.value = new Audio(props.song.url)

  audio.value.volume = volume.value / 100;
  audio.value.onended = nextSong
  audio.value.onplay = () => {
    isPlaying.value = true; // 音频播放时更新状态
  }
  audio.value.onpause = () => {
    isPlaying.value = false // 音频暂停时更新状态
  }
  audio.value.volume = volume.value / 100;
  audio.value.addEventListener('loadedmetadata', () => {
    console.log('总播放时间:', audio.value.duration); // 以秒为单位
    duration.value =  audio.value.duration
  })

  audio.value.ontimeupdate = () => {

    if (!isDragging.value) { // 只有在未拖动时更新位置
      position.value = audio.value.currentTime / duration.value * 100
    }
  }

}

const formatTime = (time) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};



function playAudio() {
  audio.value.play()
}
function pauseAudio() {
  audio.value.pause()
}


function nextSong() {
  loadAudio()
  playAudio()
}

function prevSong() {
  loadAudio()
  playAudio()
}
function baba() {
  alert(duration.value)

}
function updateVolume() {
  if (audio) {
    audio.value.volume = volume.value / 100;
  }
}
function updatePosition() {
  if (audio) {
    audio.value.currentTime = position.value / 100 * audio.value.duration;
  }
  audio.value.play()
}

onBeforeMount(() => {
  loadAudio()
})
</script>

<template>
    <div class="music-player">
      <!-- 播放控制 -->
      <div class="left-controls">
        <span @click="prevSong">
          <i class="prePlay-icon"></i>
        </span>
        <span>
          <i class="play-icon" @click="playAudio()" v-if="!isPlaying"></i>
          <i class="pause-icon" @click="pauseAudio()" v-else></i>
        </span>
        <span @click="nextSong">
          <i class="nextPlay-icon"></i>
        </span>
      </div>

      <img class="cover" :src="song.cover">
      <div style="display: flex;flex-direction: column;margin-right: 150px;width: 100%">
        <div style="display: flex;justify-content: space-between;font-size: 15px;color: #e8e8e8;opacity: 0.8">
          <div>
            <span style="">{{ song.title }}</span> - <span>{{ song.musician }}</span>
          </div>
          <div>
            <span>{{ formatTime(audio.currentTime) }}</span> / <span>{{ formatTime(duration) }}</span>
          </div>
        </div>
        <el-slider step="0.1" class="song-slider" v-model="position" @change="updatePosition" @mousedown="isDragging = true"
                   @mouseup="isDragging = false" :show-tooltip="false" />
      </div>


      <div style="margin-left: auto" class="right-controls">
        <i class="download-icon"></i>
        <i class="volume-icon"></i>
        <el-slider style="width: 80px" v-model="volume" @input="updateVolume" />
      </div>
    </div>

</template>




<style scoped>
* {
  font-family: poppin,Tahoma,Arial,\5FAE\8F6F\96C5\9ED1,sans-serif;
}
.music-player {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #4d4d4d, #313131);
  color: white;
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 10px 17% 15px;
}

i {
  display: inline-block;
  background: url("/src/assets/img/total4.png");
  opacity: 0.8;
  transform: scale(0.5);
  cursor: pointer;
}
i:hover {
  opacity: 1;
}
.play-icon {
  background-position: 0 0;
  width: 42px;
  height: 58px;
  margin: 0 10px;
}
.pause-icon {
  background-position: -60px 0;
  width: 42px;
  height: 58px;
  margin: 0 10px;
}
.prePlay-icon {
  width: 58px;
  height: 40px;
  background-position: 0 -60px;
}
.nextPlay-icon {
  width: 58px;
  height: 40px;
  background-position: 0 -104px;
}
.volume-icon {
  width: 52px;
  height: 42px;
  background-position: 0 -288px;
}
.download-icon {
  width: 44px;
  height: 42px;
  background-position: 0 -240px;
}
.cover {
  width: 50px;
  height: 50px;
  border-radius: 5px;
  margin-right: 20px;
  margin-left: 50px;
}

.left-controls, .right-controls {
  display: flex;
  align-items: center;
}
.song-slider {
  margin-left: 5px;
}

</style>


