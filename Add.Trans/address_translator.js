let countyMapping = {};
    let addressMapping = {};
    let streetMapping = {};

    window.onload = () => {
      Promise.all([
        fetch('County_address_mapping_with_zip.json').then(res => res.json()),
        fetch('address_mapping.json').then(res => res.json()),
        fetch('street_mapping.json').then(res => res.json())
      ]).then(([county, address, street]) => {
        countyMapping = county;
        addressMapping = address;
        streetMapping = street;
        console.log("JSON 讀取完成");
      });

      document.getElementById("chineseAddress")
        .addEventListener("input", convertAddress);
    };

    function convertAddress() {
      let input = document.getElementById('chineseAddress').value.trim();
      if (!input) {
        document.getElementById('englishAddress').value = "";
        return;
      }
      input = input.replace(/台/g, '臺');       // 統一「臺」

      /* -------- 1. 解析縣市區 & 郵遞區號 -------- */
      let zip = "", countyEN = "";
      const sortedCounty = Object.keys(countyMapping)
        .sort((a, b) => b.length - a.length);

      for (const key of sortedCounty) {
        if (input.includes(key)) {
          zip = countyMapping[key].zip || "";
          countyEN = countyMapping[key].en;        // 例如 "East Dist., Tainan City"
          input = input.replace(key, "");       // 拆掉中文縣市區
          break;
        }
      }
      if (!countyEN) {
        const cityOnly = input.match(/^[^\d巷弄號樓室]+?[市縣]/); 
        if (cityOnly) {
          const k = Object.keys(countyMapping).find(c => c.startsWith(cityOnly[0]));
          if (k) {
            countyEN = countyMapping[k].en.split(',').pop().trim();  
            input = input.replace(cityOnly[0], "");
          }
        }
      }
      /* -------- 2. 解析街道（ XX 路、XX 街） -------- */
      let streetEN = "";
      const sortedStreet = Object.keys(streetMapping)
        .sort((a, b) => b.length - a.length);
      for (const key of sortedStreet) {
        if (input.includes(key)) {
          streetEN = streetMapping[key];           // 例如 "Rongyu St."
          input = input.replace(key, "");
          break;                                   
        }
      }

      /* -------- 3. 解析門牌／巷弄樓室 -------- */
      let laneAlleyEtc = "";   // Ln. / Aly. 
      let doorNo = "";   // No. XXX
      let floorNo = "";    // 12F
      let roomNo = "";    // Rm. 1
      const extraRules = [
        {
          re: /(\d+)巷/g,
          repl: (_, n) => { laneAlleyEtc += `Ln. ${n}, `; return ""; }
        },
        {
          re: /(\d+)弄/g,
          repl: (_, n) => { laneAlleyEtc += `Aly. ${n}, `; return ""; }
        },
        {
          
          re: /(\d+)號(?:([\d]+)(?:[-之]([\d]+))?)?樓?/g,   
          repl: (_, no, flr, rm) => {
            doorNo = `No. ${no}`;
            if (flr) floorNo = `${flr}F`;
            if (rm) roomNo = `Rm. ${rm}`;
            return "";
          }
        }
      ];
      extraRules.forEach(rule => { input = input.replace(rule.re, rule.repl); });

      const tailRules = [
        { re: /(\d+)樓/g, repl: '$1F' },
        { re: /(\d+)室/g, repl: 'Rm. $1' },
        { re: /東/g, repl: ' E.' }, { re: /西/g, repl: ' W.' },
        { re: /南/g, repl: ' S.' }, { re: /北/g, repl: ' N.' },
        { re: /一/g, repl: '1st' }, { re: /二/g, repl: '2nd' },
        { re: /三/g, repl: '3rd' }, { re: /四/g, repl: '4th' },
        { re: /五/g, repl: '5th' }
      ];
      tailRules.forEach(r => { input = input.replace(r.re, r.repl); });
      input = input.replace(/^\s*,\s*|\s*,\s*$/g, ""); // 去掉首尾逗號

      /* -------- 5. 依照新順序組裝 -------- */
      const pieces = [
        floorNo,                    // 12F
        roomNo,                     // Rm. 1
        doorNo,                     // No. 300
        laneAlleyEtc.trimEnd(),     // Ln. / Aly.
        streetEN,                   // Sec. 3, Zhongxiao E. Rd.
        countyEN                    // Da’an Dist., Taipei City
      ].filter(Boolean)
        .map(p => p.replace(/\s*,\s*$/, ""));

      // ---------- Google Maps 用字串 ---------- //
      let queryStr = pieces.join(', ');          // 不含「Taiwan」
      if (zip) queryStr += ` ${zip}`;            // 郵遞區號保留
      window.gmapsQuery = queryStr;              // 存成全域變數

      // ---------- 使用者閱讀用字串 ---------- //
      let result = `${queryStr}, Taiwan (R.O.C.)`;   //用 queryStr 再加國名
      document.getElementById('englishAddress').value = result;
    }

    /* -------- 共用：Bootstrap Toast 工具函式 -------- */
    function showToast(message, variant = 'success') {
      const toastElement = document.getElementById('liveToast');
      const toastBody = document.getElementById('toastBody');

      // 更新文字
      toastBody.textContent = message;

      // 依 variant 換背景色
      toastElement.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-info');
      toastElement.classList.add(`bg-${variant}`);

      // 建立 (或取得已存在的) Toast 實例並顯示
      const toast = bootstrap.Toast.getOrCreateInstance(toastElement);
      toast.show();
    }

    /* --- Copy to clipboard --- */
    document.getElementById('copyBtn').addEventListener('click', () => {
      const addr = document.getElementById('englishAddress').value.trim();
      if (!addr) {
        showToast('請先輸入中文地址並完成轉換', 'secondary');
        return;
      }

      navigator.clipboard.writeText(addr)
        .then(() => showToast('已複製到剪貼簿！', 'secondary'))
        .catch(() => showToast('複製失敗，請檢查瀏覽器權限', 'secoendary'));
    });

    /* --- Open Google Maps --- */
    document.getElementById('mapBtn').addEventListener('click', () => {
      const addr = (window.gmapsQuery || '').trim();
      if (!addr) {
        showToast('請先輸入中文地址並完成轉換', 'secondary');
        return;
      }
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
      window.open(url, '_blank');
      showToast('已在新分頁開啟 Google Maps', 'secondary');
    });

    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('copyBtn').addEventListener('click', () => { });
      document.getElementById('mapBtn').addEventListener('click', () => { });
    });