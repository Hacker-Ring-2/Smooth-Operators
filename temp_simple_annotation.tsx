// SIMPLE ANNOTATION RENDERING - Replace the complex version

// Draw all annotations - SIMPLE & CLEAN
annotations.forEach(annotation => {
  if (!annotation.visible) return;
  
  ctx.strokeStyle = annotation.color;
  ctx.fillStyle = annotation.color;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
  
  if (annotation.type === 'trendline' && annotation.points && annotation.points.length >= 2) {
    // Draw trendlines
    const start = annotation.points[0];
    const end = annotation.points[1];
    
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    
    // Add small circles at endpoints
    ctx.beginPath();
    ctx.arc(start.x, start.y, 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(end.x, end.y, 4, 0, 2 * Math.PI);
    ctx.fill();
    
    // Label in the middle
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2 - 15;
    ctx.font = '12px sans-serif';
    ctx.fillText(annotation.label, midX - 30, midY);
    
  } else if (annotation.type === 'point' && annotation.points?.[0]) {
    // Draw points as circles
    const point = annotation.points[0];
    ctx.beginPath();
    ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
    ctx.fill();
    
    // Label below point
    ctx.font = '12px sans-serif';
    ctx.fillText(annotation.label, point.x - 30, point.y + 20);
    
  } else if ((annotation.type === 'support' || annotation.type === 'resistance') && annotation.price !== undefined) {
    // Draw horizontal lines
    const pixelY = priceToPixel(annotation.price);
    
    if (pixelY >= 0 && pixelY <= canvas.height) {
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, pixelY);
      ctx.lineTo(canvas.width, pixelY);
      ctx.stroke();
      
      // Price label on the right
      ctx.setLineDash([]);
      const labelText = `$${annotation.price.toFixed(2)}`;
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(canvas.width - 80, pixelY - 10, 75, 20);
      ctx.fillStyle = annotation.color;
      ctx.fillText(labelText, canvas.width - 75, pixelY + 4);
    }
  }
  
  // Reset styles
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
});