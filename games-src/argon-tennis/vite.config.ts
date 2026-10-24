import {defineConfig} from 'vite';
export default defineConfig({base:'/games/rally-club/',build:{outDir:'../../public/games/rally-club',emptyOutDir:true,target:'es2020'},resolve:{alias:{'../assets/vendor/GLTFLoader.js':'three/examples/jsm/loaders/GLTFLoader.js'}}});
