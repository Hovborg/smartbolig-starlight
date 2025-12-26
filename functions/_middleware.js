// Cloudflare Pages Function: Geo-based language redirect
// Danske IP'er → /da/, alle andre → /en/

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const country = request.cf?.country || 'XX';
  
  // Kun redirect på root path (/)
  if (url.pathname === '/' || url.pathname === '') {
    
    // Tjek om bruger allerede har valgt sprog (cookie)
    const cookies = request.headers.get('Cookie') || '';
    if (cookies.includes('preferred-lang=')) {
      // Bruger har valgt sprog manuelt - respekter det
      return next();
    }
    
    // Danmark → dansk version
    if (country === 'DK') {
      return Response.redirect(`${url.origin}/da/`, 302);
    }
    
    // Alle andre lande → engelsk version
    return Response.redirect(`${url.origin}/en/`, 302);
  }
  
  // Alle andre paths - fortsæt normalt
  return next();
}
