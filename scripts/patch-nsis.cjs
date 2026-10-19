const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '../node_modules/app-builder-lib/out/targets/nsis/NsisTarget.js');

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, 'utf8');
  if (!content.includes('uninstallerExtracted')) {
    const targetPattern = 'if ((0, macosVersion_1.isMacOsCatalina)()) {';
    if (content.includes(targetPattern)) {
      const replacement = `let uninstallerExtracted = false;
        try {
            await nsisUtil_1.UninstallerReader.exec(installerPath, uninstallerPath);
            uninstallerExtracted = true;
        } catch (readerErr) {
            builder_util_1.log.debug({ error: readerErr.message }, "UninstallerReader fallback");
        }
        if (!uninstallerExtracted) {
            if ((0, macosVersion_1.isMacOsCatalina)()) {`;
      
      // Also close the extra if block before signIf
      const targetWineBlock = `const wineVm = new WineVm_1.WineVmManager((_a = packager.config.toolsets) === null || _a === void 0 ? void 0 : _a.wine);
            await wineVm.exec(installerPath, [], { env: { __COMPAT_LAYER: "RunAsInvoker" } });
        }`;
      
      const replacementWineBlock = `const wineVm = new WineVm_1.WineVmManager((_a = packager.config.toolsets) === null || _a === void 0 ? void 0 : _a.wine);
                await wineVm.exec(installerPath, [], { env: { __COMPAT_LAYER: "RunAsInvoker" } });
            }
        }`;

      content = content.replace(targetPattern, replacement).replace(targetWineBlock, replacementWineBlock);
      fs.writeFileSync(targetFile, content);
      console.log('Successfully patched NsisTarget.js for Wine-free uninstaller extraction');
    }
  }
}
