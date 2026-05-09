#!/usr/bin/env python3
"""
Generate placeholder icons for Boss Assistant Chrome Extension
"""

try:
    from PIL import Image, ImageDraw, ImageFont
    import os

    # Icon sizes
    sizes = [16, 48, 128]

    # Colors
    bg_color = (102, 126, 234)  # #667eea
    text_color = (255, 255, 255)  # white

    # Get the directory of this script
    script_dir = os.path.dirname(os.path.abspath(__file__))

    for size in sizes:
        # Create image with gradient-like background
        img = Image.new('RGB', (size, size), bg_color)
        draw = ImageDraw.Draw(img)

        # Add simple gradient effect
        for y in range(size):
            # Gradient from #667eea to #764ba2
            r = int(102 + (118 - 102) * y / size)
            g = int(126 - (126 - 75) * y / size)
            b = int(234 - (234 - 162) * y / size)
            draw.rectangle([(0, y), (size, y + 1)], fill=(r, g, b))

        # Add text "B"
        if size >= 48:
            try:
                # Try to use a nice font
                font_size = int(size * 0.6)
                font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
            except:
                try:
                    font = ImageFont.truetype("Arial.ttf", font_size)
                except:
                    font = ImageFont.load_default()

            # Get text bounding box
            text = "B"
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]

            # Center the text
            x = (size - text_width) // 2 - bbox[0]
            y = (size - text_height) // 2 - bbox[1]

            # Draw text with shadow for better visibility
            shadow_offset = max(1, size // 32)
            draw.text((x + shadow_offset, y + shadow_offset), text, fill=(0, 0, 0, 128), font=font)
            draw.text((x, y), text, fill=text_color, font=font)

        # Save the image
        output_path = os.path.join(script_dir, f'icon{size}.png')
        img.save(output_path, 'PNG')
        print(f'Created {output_path}')

    print('\nIcons generated successfully!')
    print('You can now use the extension or replace these with custom-designed icons.')

except ImportError:
    print('PIL (Pillow) is not installed.')
    print('Please install it with: pip install Pillow')
    print('\nOr create icons manually using online tools:')
    print('- https://realfavicongenerator.net/')
    print('- https://appicon.co/')
    print('- https://www.canva.com/')
