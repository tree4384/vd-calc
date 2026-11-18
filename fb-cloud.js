/* クラウド保存(Firebase)
   Googleでログインすると、現場データを Firestore の users/<自分のid>/<アプリ名>/ に保存する。
   ほかの人のデータは読めない(Firestoreのルールで本人だけに制限)。
   部品(fb/ の中の firebase-*.js)はこのリポジトリに置いてあるので、外部のCDNには頼らない。
   index.html からは window.FBC を使う:
     FBC.init(ユーザーが変わったら呼ばれる関数)  … 起動時に1回
     FBC.col(uid)   … 現場の保存先(doc(id).set/delete, onSnapshot が使える)
     FBC.signIn() / FBC.signOut() */
(function () {
  var CFG = {
    apiKey: "AIzaSyADD0DQ-xh63pkPk3ZarhGg6BYQeFUZtoU",
    authDomain: "fire-34a05.firebaseapp.com",
    projectId: "fire-34a05",
    storageBucket: "fire-34a05.firebasestorage.app",
    messagingSenderId: "465604822335",
    appId: "1:465604822335:web:b125c2bedf12617c9f3f8a"
  };
  var me = document.currentScript;
  var NAME = (me && me.getAttribute("data-col")) || "app";
  var BASE = me && me.src ? me.src.replace(/[^\/]*$/, "") + "fb/" : "fb/";
  var auth = null, db = null, ready = null;

  function load(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = BASE + src; s.onload = res;
      s.onerror = function () { s.remove(); rej(new Error("load " + src)); };
      document.head.appendChild(s);
    });
  }

  /* Firestoreは「配列の中に配列」を保存できないので、現場データは文字(JSON)にして入れる */
  function wrapDoc(d) {
    return {
      id: d.id,
      data: function () {
        var b = d.data() || {}, data = {};
        try { data = b.json ? JSON.parse(b.json) : (b.data || {}); } catch (e) { data = {}; }
        return { name: b.name || "", updated: +b.updated || 0, data: data };
      }
    };
  }
  function wrapSnap(qs) {
    return {
      metadata: qs.metadata,
      docs: qs.docs.map(wrapDoc),
      docChanges: function () {
        return qs.docChanges().map(function (ch) { return { type: ch.type, doc: wrapDoc(ch.doc) }; });
      }
    };
  }

  window.FBC = {
    init: function (onUser) {
      if (ready) return ready;
      ready = load("firebase-app-compat.js")
        .then(function () { return Promise.all([load("firebase-auth-compat.js"), load("firebase-firestore-compat.js")]); })
        .then(function () {
          if (!firebase.apps.length) firebase.initializeApp(CFG);
          auth = firebase.auth(); db = firebase.firestore();
          auth.getRedirectResult().catch(function () {});
          auth.onAuthStateChanged(function (u) { onUser(u || null); });
        });
      ready.catch(function () { ready = null; });
      return ready;
    },
    ready: function () { return !!auth; },
    col: function (uid) {
      var ref = db.collection("users").doc(uid).collection(NAME);
      return {
        doc: function (id) {
          return {
            set: function (b) {
              return ref.doc(id).set({ name: b.name || "", updated: +b.updated || 0, json: JSON.stringify(b.data || {}) });
            },
            delete: function () { return ref.doc(id).delete(); }
          };
        },
        onSnapshot: function (next, err) {
          return ref.onSnapshot(function (qs) { next(wrapSnap(qs)); }, err);
        }
      };
    },
    signIn: function () {
      var p = new firebase.auth.GoogleAuthProvider();
      p.setCustomParameters({ prompt: "select_account" });
      return auth.signInWithPopup(p).catch(function (e) {
        var c = (e && e.code) || "";
        if (/popup-blocked|operation-not-supported|web-storage-unsupported/.test(c)) return auth.signInWithRedirect(p);
        throw e;
      });
    },
    signOut: function () { return auth.signOut(); }
  };
})();
