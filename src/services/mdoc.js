import { decode, encode } from 'cbor-x';

/**
 * Creates a DeviceResponse CBOR structure for mdoc presentation
 * according to ISO/IEC 18013-5 and OpenID4VP specifications
 */
export async function createDeviceResponse(credentialBase64url, params) {
  console.log('Creating DeviceResponse for mdoc presentation');
  
  try {
    // Decode the base64url-encoded credential
    const credentialBytes = base64urlDecode(credentialBase64url);
    console.log('Decoded credential bytes:', credentialBytes.length, 'bytes');
    console.log('First 50 bytes (hex):', Array.from(credentialBytes.slice(0, 50)).map(b => b.toString(16).padStart(2, '0')).join(' '));
    
    // The credential from the issuer is an IssuerSigned structure in CBOR format
    // According to ISO 18013-5, we need to wrap it in a Document, then in DeviceResponse
    
    // Parse just enough to understand the structure
    let credentialData;
    try {
      credentialData = decode(credentialBytes);
      console.log('Decoded credential structure type:', typeof credentialData);
      console.log('Decoded credential keys:', Object.keys(credentialData || {}));
    } catch (cborError) {
      console.error('Failed to decode CBOR:', cborError);
      credentialData = null;
    }
    
    // Build DeviceResponse with the original issuerSigned bytes preserved
    // This is critical - we must not re-encode issuerSigned as it would break signatures
    const deviceResponseBytes = buildDeviceResponseWithRawIssuerSigned(credentialBytes, credentialData, params);
    console.log('Encoded DeviceResponse:', deviceResponseBytes.length, 'bytes');
    
    // Encode to base64url
    const deviceResponseBase64url = base64urlEncode(deviceResponseBytes);
    console.log('DeviceResponse base64url (first 100 chars):', deviceResponseBase64url.substring(0, 100));
    
    return deviceResponseBase64url;
  } catch (error) {
    console.error('Error creating DeviceResponse:', error);
    console.error('Error stack:', error.stack);
    throw new Error(`Failed to create DeviceResponse: ${error.message}`);
  }
}

/**
 * Build DeviceResponse while preserving the original IssuerSigned CBOR bytes
 * 
 * DeviceResponse CBOR structure (ISO 18013-5):
 * {
 *   "version": "1.0",
 *   "documents": [Document],
 *   "status": 0
 * }
 * 
 * Document CBOR structure:
 * {
 *   "docType": "eu.europa.ec.av.1",
 *   "issuerSigned": <embedded CBOR data>,
 *   "deviceSigned": {...}
 * }
 * 
 * CRITICAL: issuerSigned must be embedded as raw CBOR data, not as a byte string.
 * We manually construct the CBOR to achieve this.
 */
function buildDeviceResponseWithRawIssuerSigned(issuerSignedBytes, parsedData, params) {
  console.log('Building DeviceResponse with raw IssuerSigned bytes');
  
  // According to walt-id MDoc.kt, deviceSigned is optional (nullable)
  // Since we don't have a device signature, we'll OMIT it entirely
  
  // Encode Document map keys and values
  const docType = "eu.europa.ec.av.1";
  const docTypeKeyBytes = encode("docType");
  const docTypeValueBytes = encode(docType);
  const issuerSignedKeyBytes = encode("issuerSigned");
  
  // Build Document as CBOR map with 2 items (docType, issuerSigned ONLY)
  // Omitting deviceSigned since it's optional and we have no device signature
  const documentMapHeader = new Uint8Array([0xa2]); // map with 2 items (not 3!)
  const documentBytes = new Uint8Array([
    ...documentMapHeader,
    ...docTypeKeyBytes,
    ...docTypeValueBytes,
    ...issuerSignedKeyBytes,
    ...issuerSignedBytes  // Raw IssuerSigned CBOR embedded directly
  ]);
  
  console.log('Document hex (first 100 bytes):', Array.from(documentBytes.slice(0, 100)).map(b => b.toString(16).padStart(2, '0')).join(' '));
  
  // Encode DeviceResponse map keys and values
  const version = "1.0";
  const versionKeyBytes = encode("version");
  const versionValueBytes = encode(version);
  const documentsKeyBytes = encode("documents");
  const statusKeyBytes = encode("status");
  const statusValueBytes = encode(0);
  
  // Build DeviceResponse as CBOR map with 3 items
  // Order: version, documents, status (matches OpenAPI example)
  const deviceResponseMapHeader = new Uint8Array([0xa3]); // map with 3 items
  const documentsArrayHeader = new Uint8Array([0x81]); // array with 1 item
  
  const deviceResponseBytes = new Uint8Array([
    ...deviceResponseMapHeader,
    ...versionKeyBytes,
    ...versionValueBytes,
    ...documentsKeyBytes,
    ...documentsArrayHeader,
    ...documentBytes,
    ...statusKeyBytes,
    ...statusValueBytes
  ]);
  
  // Diagnostic logging
  console.log('DeviceResponse CBOR structure:');
  console.log('  Total bytes:', deviceResponseBytes.length);
  console.log('  First 150 bytes (hex):', Array.from(deviceResponseBytes.slice(0, 150)).map(b => b.toString(16).padStart(2, '0')).join(' '));
  console.log('  Map header:', deviceResponseBytes[0].toString(16));
  
  return deviceResponseBytes;
}

/**
 * Base64url decode
 */
function base64urlDecode(base64url) {
  // Convert base64url to base64
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding
  while (base64.length % 4) {
    base64 += '=';
  }
  // Decode base64 to binary string
  const binaryString = atob(base64);
  // Convert binary string to Uint8Array
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Base64url encode
 */
function base64urlEncode(bytes) {
  // Convert Uint8Array to binary string
  let binaryString = '';
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  // Encode to base64
  let base64 = btoa(binaryString);
  // Convert to base64url
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
