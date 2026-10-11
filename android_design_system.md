# FabriSense - Android Studio UI/UX Integration Guide

This guide provides the complete design system resources, Jetpack Compose screen components, XML layouts, and custom overlay views to integrate the **FabriSense AI Fabric Defect Detection App** directly into your **Android Studio** project.

---

## 1. Color Palette Resources (`res/values/colors.xml`)

Copy these color tokens into your Android Studio project at `app/src/main/res/values/colors.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Background & Surface Colors -->
    <color name="bg_dark">#070A11</color>
    <color name="bg_surface">#0F172A</color>
    <color name="bg_card">#111827</color>
    <color name="bg_card_translucent">#C8111827</color>
    <color name="border_subtle">#1AFFFFFF</color>
    
    <!-- Accent & Brand Colors -->
    <color name="accent_cyan">#06B6D4</color>
    <color name="accent_cyan_glow">#6606B6D4</color>
    <color name="accent_indigo">#6366F1</color>
    <color name="accent_blue">#3B82F6</color>
    
    <!-- Defect & Status Colors -->
    <color name="defect_critical">#EF4444</color>
    <color name="defect_warning">#F59E0B</color>
    <color name="status_pass">#10B981</color>
    <color name="status_pass_bg">#2610B981</color>
    
    <!-- Text Colors -->
    <color name="text_primary">#F8FAFC</color>
    <color name="text_secondary">#94A3B8</color>
    <color name="text_dim">#64748B</color>
</resources>
```

---

## 2. Jetpack Compose Integration (Recommended for Modern Android Studio)

### `Theme.kt` (Design Tokens)

```kotlin
package com.fabrisense.ui.theme

import androidx.compose.material3.DarkColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val FabriSenseDarkColorScheme = DarkColorScheme(
    primary = Color(0xFF06B6D4),
    secondary = Color(0xFF6366F1),
    background = Color(0xFF070A11),
    surface = Color(0xFF0F172A),
    onPrimary = Color.White,
    onBackground = Color(0xFFF8FAFC),
    onSurface = Color(0xFFF8FAFC)
)

@Composable
fun FabriSenseTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = FabriSenseDarkColorScheme,
        content = content
    )
}
```

### `FabriSenseScannerScreen.kt` (Full Camera & Overlay UI)

```kotlin
package com.fabrisense.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

data class DefectBoundingBox(
    val label: String,
    val confidence: Float,
    val x: Float, // Normalized 0.0 .. 1.0
    val y: Float,
    val w: Float,
    val h: Float,
    val isCritical: Boolean
)

@Composable
fun FabriSenseScannerScreen(
    detectedDefects: List<DefectBoundingBox>,
    onToggleCamera: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF070A11))
            .padding(16.dp)
    ) {
        // App Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "FabriSense AI",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF06B6D4)
                )
                Text(
                    text = "Textile Inspection Camera",
                    fontSize = 12.sp,
                    color = Color(0xFF94A3B8)
                )
            }
            Surface(
                color = Color(0x2610B981),
                shape = RoundedCornerShape(20.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF10B981))
            ) {
                Text(
                    text = "● REAL-TIME",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF10B981),
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                )
            }
        }

        // Camera Viewfinder Box with AI Bounding Overlay
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .background(Color.Black, RoundedCornerShape(16.dp))
                .border(1.dp, Color(0x4006B6D4), RoundedCornerShape(16.dp))
        ) {
            // Camera Preview Placeholder / CameraX SurfaceView goes here

            // Custom Canvas Overlay for Bounding Boxes
            Canvas(modifier = Modifier.fillMaxSize()) {
                val canvasW = size.width
                val canvasH = size.height

                detectedDefects.forEach { defect ->
                    val boxX = defect.x * canvasW
                    val boxY = defect.y * canvasH
                    val boxW = defect.w * canvasW
                    val boxH = defect.h * canvasH

                    val strokeColor = if (defect.isCritical) Color(0xFFEF4444) else Color(0xFFF59E0B)

                    // Draw Bounding Box Rectangle
                    drawRect(
                        color = strokeColor,
                        topLeft = Offset(boxX, boxY),
                        size = Size(boxW, boxH),
                        style = Stroke(width = 4f)
                    )

                    // Fill Semi-transparent highlight
                    drawRect(
                        color = strokeColor.copy(alpha = 0.15f),
                        topLeft = Offset(boxX, boxY),
                        size = Size(boxW, boxH)
                    )

                    // Draw Corner Reticles
                    val lineLen = 24f
                    val cyan = Color(0xFF06B6D4)
                    // Top-Left Corner
                    drawLine(cyan, Offset(boxX, boxY), Offset(boxX + lineLen, boxY), strokeWidth = 6f)
                    drawLine(cyan, Offset(boxX, boxY), Offset(boxX, boxY + lineLen), strokeWidth = 6f)
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Summary Metric Bar
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Card(
                modifier = Modifier.weight(1f),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF111827))
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text("DEFECT COUNT", fontSize = 10.sp, color = Color(0xFF94A3B8))
                    Text("${detectedDefects.size}", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Color(0xFFEF4444))
                }
            }
            Card(
                modifier = Modifier.weight(1f),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF111827))
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text("FABRIC GRADE", fontSize = 10.sp, color = Color(0xFF94A3B8))
                    Text(if (detectedDefects.isEmpty()) "Grade A" else "Grade B", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color(0xFFF59E0B))
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Action Button
        Button(
            onClick = onToggleCamera,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF06B6D4)),
            shape = RoundedCornerShape(12.dp)
        ) {
            Text("SCAN FABRIC ROLL", color = Color.White, fontWeight = FontWeight.Bold)
        }
    }
}
```

---

## 3. Custom View Overlay for XML-based Android Studio Projects (`DefectOverlayView.kt`)

If your Android Studio project uses traditional **XML Layouts**, add this Custom View to draw AI bounding boxes dynamically over your `PreviewView`:

```kotlin
package com.fabrisense.ui.views

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.util.AttributeSet
import android.view.View

class DefectOverlayView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private val boxPaint = Paint().apply {
        color = Color.parseColor("#EF4444")
        style = Paint.Style.STROKE
        strokeWidth = 6f
        isAntiAlias = true
    }

    private val labelPaint = Paint().apply {
        color = Color.WHITE
        textSize = 36f
        isAntiAlias = true
    }

    private val labelBgPaint = Paint().apply {
        color = Color.parseColor("#EF4444")
        style = Paint.Style.FILL
    }

    private val rects = mutableListOf<RectF>()
    private val labels = mutableListOf<String>()

    fun setDefects(newRects: List<RectF>, newLabels: List<String>) {
        rects.clear()
        labels.clear()
        rects.addAll(newRects)
        labels.addAll(newLabels)
        postInvalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        for (i in rects.indices) {
            val rect = rects[i]
            val label = labels.getOrElse(i) { "Defect" }

            // Draw bounding box
            canvas.drawRect(rect, boxPaint)

            // Draw label background
            val textWidth = labelPaint.measureText(label)
            canvas.drawRect(
                rect.left,
                rect.top - 50f,
                rect.left + textWidth + 20f,
                rect.top,
                labelBgPaint
            )

            // Draw label text
            canvas.drawText(label, rect.left + 10f, rect.top - 15f, labelPaint)
        }
    }
}
```

---

## 4. Verification & Testing in Android Studio

1. **CameraX Setup**: Add `androidx.camera:camera-camera2:1.3.0` dependencies to your `build.gradle.kts`.
2. **Real-time Inference Integration**: Pass bounding box coordinates output by your TFLite or ONNX model into `FabriSenseScannerScreen` or `DefectOverlayView`.
3. **Color Verification**: Open your Android Studio layout preview tab to verify the deep slate dark glassmorphism theme and glowing cyan accent styling!
