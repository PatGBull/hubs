AFRAME.registerComponent("in-world-hud", {
  init() {
    window.hud = this;
    this.bg = this.el.querySelector(".bg");
    this.mic = this.el.querySelector(".mic");
    this.unmuted = new THREE.TextureLoader().load("../assets/hud/unmuted.png");
    this.mat = this.mic.object3DMap.mesh.material;
    this.onAudioFrequencyChange = e => {
      this.mic.object3DMap.mesh.material.uniforms.u_volume.value = e.detail.volume / 10.0;
      //      this.mic.object3DMap.mesh.material.uniformsNeedUpdate = true;
    };

    this.el.sceneEl.addEventListener("mediaStream", evt => {
      this.ms = evt.detail.ms;
      const ctx = THREE.AudioContext.getContext();
      const source = ctx.createMediaStreamSource(this.ms);
      this.analyser = ctx.createAnalyser();
      this.levels = new Uint8Array(this.analyser.frequencyBinCount);
      console.log(source);
      source.connect(this.analyser);
    });

    this.mic.object3DMap.mesh.material = new THREE.RawShaderMaterial({
      uniforms: {
        u_volume: { value: 0.5 },
        u_image: { value: this.unmuted }
      },

      vertexShader:
        "precision mediump float;" +
        "uniform mat4 modelViewMatrix; " +
        "uniform mat4 projectionMatrix; " +
        "attribute vec2 a_texCoord;" +
        "attribute vec3 position;" +
        "attribute vec2 uv;" +
        "varying vec2 vUv;" +
        "void main(){" +
        "gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.0);" +
        "vUv = uv;" +
        "}",
      fragmentShader:
        "precision mediump float;" +
        "uniform sampler2D u_image;" +
        "uniform float u_volume;" +
        "varying vec2 vUv;" +
        "void main(){" +
        "vec4 color = texture2D(u_image, vUv);" +
        "if (color.a < 0.01) discard;" +
        "if (u_volume > 0.1 && vUv.y > 0.4 && vUv.y < 0.55){ gl_FragColor = vec4(0,1,1,1);}" +
        "else if (u_volume > 0.3 && vUv.y > 0.6 && vUv.y < 0.75){ gl_FragColor = vec4(0,1,1,1);}" +
        "else if (u_volume > 0.5 && vUv.y > 0.8 && vUv.y < 0.9){ gl_FragColor = vec4(0,1,1,1);}" +
        "else {gl_FragColor = texture2D(u_image, vUv);}" +
        //      vec4(1,1,1,1);
        "}",
      side: THREE.DoubleSide
    });

    this.nametag = this.el.querySelector(".nametag");
    this.nametag.object3DMap.text.material.depthTest = false;
    this.avatar = this.el.querySelector(".avatar");

    const muted = this.el.sceneEl.is("muted");
    //    this.mic.setAttribute("src", muted ? "#muted" : "#unmuted");

    const avatarScale = "0.1 0.1 0.1";
    const flipXAvatarScale = "-" + avatarScale;

    const scene = this.el.sceneEl;
    this.onUsernameChanged = this.onUsernameChanged.bind(this);
    scene.addEventListener("username-changed", this.onUsernameChanged);

    this.addBlue = () => {
      this.nametag.setAttribute("color", "cyan");
    };
    this.removeBlue = () => {
      this.nametag.setAttribute("color", "white");
    };
    this.flipX = () => {
      this.avatar.setAttribute("scale", flipXAvatarScale);
    };
    this.unflipX = () => {
      this.avatar.setAttribute("scale", avatarScale);
    };
    this.onMicHover = () => {
      this.hoveredOnMic = true;
      const muted = scene.is("muted");
      this.mic.setAttribute("src", muted ? "#unmuted" : "#muted");
    };

    this.showCorrectMuteState = () => {
      const muted = this.el.sceneEl.is("muted");
      this.mic.setAttribute("src", muted ? "#muted" : "#unmuted");
    };

    this.onStateChange = evt => {
      if (evt.detail !== "muted") return;
      this.showCorrectMuteState();
    };

    this.onMicHoverExit = () => {
      this.hoveredOnMic = false;
      this.showCorrectMuteState();
    };

    this.onSelect = evt => {
      if (this.hoveredOnMic) {
        this.el.emit("action_mute");
      }
    };

    this.onClick = () => {
      this.el.emit("action_select_hud_item");
    };
  },

  play() {
    this.mic.addEventListener("raycaster-intersected", this.onMicHover);
    this.mic.addEventListener("raycaster-intersected-cleared", this.onMicHoverExit);

    this.nametag.addEventListener("raycaster-intersected", this.addBlue);
    this.nametag.addEventListener("raycaster-intersected-cleared", this.removeBlue);

    this.avatar.addEventListener("raycaster-intersected", this.flipX);
    this.avatar.addEventListener("raycaster-intersected-cleared", this.unflipX);

    this.el.sceneEl.addEventListener("stateadded", this.onStateChange);
    this.el.sceneEl.addEventListener("stateremoved", this.onStateChange);

    this.el.sceneEl.addEventListener("action_select_hud_item", this.onSelect);
    document.addEventListener("click", this.onClick);

    this.el.sceneEl.addEventListener("micAudio", this.onAudioFrequencyChange);
  },

  pause() {
    this.nametag.removeEventListener("raycaster-intersected", this.addBlue);
    this.nametag.removeEventListener("raycaster-intersected-cleared", this.removeBlue);

    this.mic.removeEventListener("raycaster-intersected", this.onMicHover);
    this.mic.removeEventListener("raycaster-intersected-cleared", this.onMicHoverExit);

    this.avatar.removeEventListener("raycaster-intersected", this.flipX);
    this.avatar.removeEventListener("raycaster-intersected-cleared", this.unflipX);

    this.el.sceneEl.removeEventListener("stateadded", this.onStateChange);
    this.el.sceneEl.removeEventListener("stateremoved", this.onStateChange);
    this.el.sceneEl.removeEventListener("action_select_hud_item", this.onSelect);
    document.removeEventListener("click", this.onClick);

    this.el.sceneEl.removeEventListener("micAudio", this.onAudioFrequencyChange);
  },

  tick: function(t, dt) {
    if (!this.analyser) return;

    this.analyser.getByteFrequencyData(this.levels);

    let sum = 0;
    for (let i = 0; i < this.levels.length; i++) {
      sum += this.levels[i];
    }
    this.volume = sum / this.levels.length;
    this.el.emit("micAudio", {
      volume: this.volume,
      levels: this.levels
    });
  },
  onUsernameChanged(evt) {
    let width;
    if (evt.detail.username.length == 0) {
      width = 1;
    } else {
      width = 40 / evt.detail.username.length;
    }
    const maxWidth = 6;
    if (width > maxWidth) {
      width = maxWidth;
    }

    this.nametag.setAttribute("text", "width", width);
    this.nametag.setAttribute("text", "value", evt.detail.username);
    this.nametag.components["text"].updateFont();
  }
});
