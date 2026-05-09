# Boss求职助手 - 图标说明

## 图标要求

本扩展需要以下三个尺寸的PNG图标：

- `icon16.png` - 16x16像素（工具栏小图标）
- `icon48.png` - 48x48像素（扩展管理页面）
- `icon128.png` - 128x128像素（Chrome Web Store和安装界面）

## 图标设计建议

### 主题色
- 主色：#667eea（紫蓝色）
- 辅色：#764ba2（紫色）

### 设计元素
- 可以使用字母"B"或"Boss"的缩写
- 可以加入聊天气泡、握手等求职相关元素
- 背景建议使用渐变色（#667eea到#764ba2）
- 图标应该清晰简洁，在小尺寸下依然可识别

## 临时替代方案

在您设计图标之前，可以使用以下在线工具快速生成占位图标：

1. **Favicon Generator** - https://realfavicongenerator.net/
2. **App Icon Generator** - https://appicon.co/
3. **Canva** - https://www.canva.com/ （搜索"app icon"）

或者使用以下命令生成纯色占位图标（需要ImageMagick）：

```bash
# 安装 ImageMagick
sudo apt-get install imagemagick  # Ubuntu/Debian
# 或
brew install imagemagick  # macOS

# 生成图标
convert -size 16x16 xc:"#667eea" icon16.png
convert -size 48x48 xc:"#667eea" icon48.png
convert -size 128x128 xc:"#667eea" icon128.png

# 添加文字（可选）
convert -size 128x128 xc:"#667eea" -font Arial -pointsize 80 -fill white -gravity center -annotate +0+0 "B" icon128.png
convert icon128.png -resize 48x48 icon48.png
convert icon128.png -resize 16x16 icon16.png
```

## 设计完成后

将三个PNG文件放在当前目录（`icons/`）下即可。
