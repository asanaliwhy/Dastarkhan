import { barcodeValid } from '../../commerce';
import { allowRequest } from '../../../server/http';
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get('code') ?? '';
  if (!barcodeValid(code)) return Response.json({ error:'Enter a valid EAN or UPC barcode.' }, { status:400 });
  if (!allowRequest('barcode:'+(request.headers.get('x-forwarded-for') ?? 'unknown'), 10)) return Response.json({error:'Try again in a minute.'},{status:429});
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,brands,quantity`, { signal:AbortSignal.timeout(8000), headers:{'User-Agent':'Dastarkhan/0.1 (https://github.com/asanaliwhy/Dastarkhan)'} });
    if (!response.ok) throw new Error();
    const data = await response.json() as { status?:number; product?:{product_name?:string;brands?:string;quantity?:string} };
    if (data.status !== 1 || !data.product?.product_name) return Response.json({error:'Barcode not found. Search by the name on the package.'},{status:404});
    return Response.json({name:data.product.product_name,brand:data.product.brands??'',quantity:data.product.quantity??'',source:`https://world.openfoodfacts.org/product/${code}`});
  } catch { return Response.json({error:'Barcode lookup is unavailable. Search by product name.'},{status:502}); }
}
