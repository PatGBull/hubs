AFRAME.registerComponent("super-spawner", {
  schema: {
    template: { default: "" },
    useCustomSpawnPosition: { default: false },
    spawnPosition: { type: "vec3" },
    events: { default: ["cursor-grab", "action_grab"] },
    spawnCooldown: { default: 1 }
  },

  init: function() {
    this.entities = new Map();
    this.timeout = null;
    this.defaultScale = this.el.getAttribute("scale").clone();
  },

  play: function() {
    this.handleGrabStart = this._handleGrabStart.bind(this);
    this.el.addEventListener("grab-start", this.handleGrabStart);
  },

  pause: function() {
    this.el.removeEventListener("grab-start", this.handleGrabStart);

    clearTimeout(this.timeout);
    this.timeout = null;
    this.el.setAttribute("visible", true);
    this.el.setAttribute("scale", this.defaultScale);
  },

  remove: function() {
    for (const entity of this.entities.keys()) {
      const data = this.entities.get(entity);
      entity.removeEventListener("componentinitialized", data.componentinInitializedListener);
      entity.removeEventListener("body-loaded", data.bodyLoadedListener);
    }

    this.entities.clear();
  },

  _handleGrabStart: function(e) {
    if (this.timeout) {
      return;
    }
    const hand = e.detail.hand;
    const entity = document.createElement("a-entity");

    entity.setAttribute("networked", "template:" + this.data.template);

    const componentinInitializedListener = this._handleComponentInitialzed.bind(this, entity);
    const bodyLoadedListener = this._handleBodyLoaded.bind(this, entity);
    this.entities.set(entity, {
      hand: hand,
      componentInitialized: false,
      bodyLoaded: false,
      componentinInitializedListener: componentinInitializedListener,
      bodyLoadedListener: bodyLoadedListener
    });

    entity.addEventListener("componentinitialized", componentinInitializedListener);
    entity.addEventListener("body-loaded", bodyLoadedListener);

    const pos = this.data.useCustomSpawnPosition ? this.data.spawnPosition : this.el.getAttribute("position");
    entity.setAttribute("position", pos);
    this.el.sceneEl.appendChild(entity);

    if (this.data.spawnCooldown > 0) {
      this.el.setAttribute("visible", false);
      this.el.setAttribute("scale", { x: 0.0001, y: 0.0001, z: 0.0001 });
      this.timeout = setTimeout(() => {
        this.el.setAttribute("visible", true);
        this.el.setAttribute("scale", this.defaultScale);
        this.timeout = null;
      }, this.data.spawnCooldown * 1000);
    }
  },

  _handleComponentInitialzed: function(entity, e) {
    if (e.detail.name === "grabbable") {
      this.entities.get(entity).componentInitialized = true;
      this._emitEvents.call(this, entity);
    }
  },

  _handleBodyLoaded: function(entity) {
    this.entities.get(entity).bodyLoaded = true;
    this._emitEvents.call(this, entity);
  },

  _emitEvents: function(entity) {
    const data = this.entities.get(entity);
    if (data.componentInitialized && data.bodyLoaded) {
      for (let i = 0; i < this.data.events.length; i++) {
        data.hand.emit(this.data.events[i], { targetEntity: entity });
      }

      entity.removeEventListener("componentinitialized", data.componentinInitializedListener);
      entity.removeEventListener("body-loaded", data.bodyLoadedListener);

      this.entities.delete(entity);
    }
  }
});
