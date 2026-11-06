import jpeg from 'npm:jpeg-js@0.4.4';
import { PNG } from 'npm:pngjs@7.0.0';
import QRCode from 'npm:qrcode@1.5.4';
import { Buffer } from 'node:buffer';

interface RequestBody {
  imageBase64?: string;
  mimeType?: string;
  maxWidth?: number;

  qrText?: string;
  qrSize?: number;
  centerImageBase64?: string;
  centerImageMimeType?: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes =
    new Uint8Array(
      binary.length,
    );

  for (
    let index = 0;
    index < binary.length;
    index += 1
  ) {
    bytes[index] =
      binary.charCodeAt(
        index,
      );
  }

  return bytes;
}

function encodeBase64(
  bytes: Uint8Array,
): string {
  let binary = '';
  const chunkSize =
    0x8000;

  for (
    let index = 0;
    index < bytes.length;
    index += chunkSize
  ) {
    binary +=
      String.fromCharCode(
        ...bytes.subarray(
          index,
          index + chunkSize,
        ),
      );
  }

  return btoa(binary);
}

function decodeImage(
  base64: string,
  mimeType:
    string,
): {
  data: Uint8Array;
  width: number;
  height: number;
} {
  const bytes =
    decodeBase64(
      base64,
    );

  if (
    mimeType ===
    'image/png'
  ) {
    const png =
      PNG.sync.read(
        Buffer.from(
          bytes,
        ),
      );

    return {
      data:
        new Uint8Array(
          png.data,
        ),
      width:
        png.width,
      height:
        png.height,
    };
  }

  if (
    mimeType ===
      'image/jpeg' ||
    mimeType ===
      'image/jpg'
  ) {
    const decoded =
      jpeg.decode(
        bytes,
        {
          useTArray:
            true,
          formatAsRGBA:
            true,
        },
      );

    if (
      !decoded?.data ||
      decoded.width <=
        0 ||
      decoded.height <=
        0
    ) {
      throw new Error(
        'No se pudo decodificar la imagen JPEG.',
      );
    }

    return {
      data:
        decoded.data as
          Uint8Array,
      width:
        decoded.width,
      height:
        decoded.height,
    };
  }

  throw new Error(
    `Formato de imagen no soportado: ${mimeType}`,
  );
}

function createEscPosRaster(
  rgba: Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  const widthBytes =
    Math.ceil(
      width / 8,
    );

  const payload =
    new Uint8Array(
      widthBytes *
      height,
    );

  for (
    let y = 0;
    y < height;
    y += 1
  ) {
    for (
      let x = 0;
      x < width;
      x += 1
    ) {
      const source =
        (
          y *
          width +
          x
        ) * 4;

      const alpha =
        rgba[
          source + 3
        ] / 255;

      const red =
        rgba[
          source
        ];

      const green =
        rgba[
          source + 1
        ];

      const blue =
        rgba[
          source + 2
        ];

      const luminance =
        (
          0.299 * red +
          0.587 * green +
          0.114 * blue
        ) * alpha +
        255 *
        (
          1 -
          alpha
        );

      if (
        luminance <
        180
      ) {
        const target =
          y *
          widthBytes +
          Math.floor(
            x / 8,
          );

        payload[
          target
        ] |=
          0x80 >>
          (
            x % 8
          );
      }
    }
  }

  const header =
    new Uint8Array([
      0x1d,
      0x76,
      0x30,
      0x00,
      widthBytes &
        0xff,
      (
        widthBytes >>
        8
      ) &
        0xff,
      height &
        0xff,
      (
        height >>
        8
      ) &
        0xff,
    ]);

  const output =
    new Uint8Array(
      header.length +
      payload.length,
    );

  output.set(
    header,
    0,
  );

  output.set(
    payload,
    header.length,
  );

  return output;
}

function buildQrRgba(
  text: string,
  requestedSize: number,
  centerImageBase64:
    string | null,
  centerImageMimeType:
    string | null,
): {
  rgba: Uint8Array;
  width: number;
  height: number;
} {
  const qr =
    QRCode.create(
      text,
      {
        errorCorrectionLevel:
          'H',
      },
    );

  const moduleCount =
    qr.modules.size;

  const quietModules =
    4;

  const desiredSize =
    Math.min(
      Math.max(
        requestedSize,
        192,
      ),
      384,
    );

  const scale =
    Math.max(
      2,
      Math.floor(
        desiredSize /
        (
          moduleCount +
          quietModules * 2
        ),
      ),
    );

  const size =
    (
      moduleCount +
      quietModules * 2
    ) *
    scale;

  const rgba =
    new Uint8Array(
      size *
      size *
      4,
    );

  rgba.fill(
    255,
  );

  for (
    let row = 0;
    row < moduleCount;
    row += 1
  ) {
    for (
      let column = 0;
      column < moduleCount;
      column += 1
    ) {
      if (
        !qr.modules.get(
          row,
          column,
        )
      ) {
        continue;
      }

      const startX =
        (
          quietModules +
          column
        ) *
        scale;

      const startY =
        (
          quietModules +
          row
        ) *
        scale;

      for (
        let y = 0;
        y < scale;
        y += 1
      ) {
        for (
          let x = 0;
          x < scale;
          x += 1
        ) {
          const target =
            (
              (
                startY +
                y
              ) *
              size +
              startX +
              x
            ) *
            4;

          rgba[
            target
          ] = 0;

          rgba[
            target + 1
          ] = 0;

          rgba[
            target + 2
          ] = 0;

          rgba[
            target + 3
          ] = 255;
        }
      }
    }
  }

  if (
    centerImageBase64
  ) {
    const logo =
      decodeImage(
        centerImageBase64,
        centerImageMimeType ||
          'image/jpeg',
      );

    if (
      logo?.data &&
      logo.width >
        0 &&
      logo.height >
        0
    ) {
      const maxLogoSide =
        Math.max(
          32,
          Math.floor(
            size *
            0.18,
          ),
        );

      const whitePad =
        Math.max(
          6,
          Math.floor(
            size *
            0.018,
          ),
        );

      const ratio =
        Math.min(
          maxLogoSide /
            logo.width,
          maxLogoSide /
            logo.height,
          1,
        );

      const logoWidth =
        Math.max(
          1,
          Math.floor(
            logo.width *
            ratio,
          ),
        );

      const logoHeight =
        Math.max(
          1,
          Math.floor(
            logo.height *
            ratio,
          ),
        );

      const boxWidth =
        logoWidth +
        whitePad * 2;

      const boxHeight =
        logoHeight +
        whitePad * 2;

      const boxX =
        Math.floor(
          (
            size -
            boxWidth
          ) / 2,
        );

      const boxY =
        Math.floor(
          (
            size -
            boxHeight
          ) / 2,
        );

      for (
        let y = 0;
        y < boxHeight;
        y += 1
      ) {
        for (
          let x = 0;
          x < boxWidth;
          x += 1
        ) {
          const target =
            (
              (
                boxY +
                y
              ) *
              size +
              boxX +
              x
            ) *
            4;

          rgba[
            target
          ] = 255;

          rgba[
            target + 1
          ] = 255;

          rgba[
            target + 2
          ] = 255;

          rgba[
            target + 3
          ] = 255;
        }
      }

      const logoX =
        boxX +
        whitePad;

      const logoY =
        boxY +
        whitePad;

      for (
        let y = 0;
        y < logoHeight;
        y += 1
      ) {
        const sourceY =
          Math.min(
            logo.height -
              1,
            Math.floor(
              y /
              ratio,
            ),
          );

        for (
          let x = 0;
          x < logoWidth;
          x += 1
        ) {
          const sourceX =
            Math.min(
              logo.width -
                1,
              Math.floor(
                x /
                ratio,
              ),
            );

          const source =
            (
              sourceY *
              logo.width +
              sourceX
            ) *
            4;

          const target =
            (
              (
                logoY +
                y
              ) *
              size +
              logoX +
              x
            ) *
            4;

          const alpha =
            (
              logo.data[
                source + 3
              ] ??
              255
            ) /
            255;

          rgba[
            target
          ] =
            Math.round(
              logo.data[
                source
              ] *
                alpha +
              255 *
                (
                  1 -
                  alpha
                ),
            );

          rgba[
            target + 1
          ] =
            Math.round(
              logo.data[
                source + 1
              ] *
                alpha +
              255 *
                (
                  1 -
                  alpha
                ),
            );

          rgba[
            target + 2
          ] =
            Math.round(
              logo.data[
                source + 2
              ] *
                alpha +
              255 *
                (
                  1 -
                  alpha
                ),
            );

          rgba[
            target + 3
          ] = 255;
        }
      }
    }
  }

  return {
    rgba,
    width:
      size,
    height:
      size,
  };
}

Deno.serve(
  async request => {
    if (
      request.method !==
      'POST'
    ) {
      return json(
        {
          error:
            'Método no permitido.',
        },
        405,
      );
    }

    try {
      const body =
        await request
          .json() as
          RequestBody;

      const qrText =
        body.qrText
          ?.trim() ??
        '';

      if (qrText) {
        const centerImage =
          body.centerImageBase64
            ?.trim() ||
          null;

        const qr =
          buildQrRgba(
            qrText,
            Number(
              body.qrSize,
            ) ||
              280,
            centerImage,
            body.centerImageMimeType
              ?.trim()
              .toLowerCase() ||
              null,
          );

        const raster =
          createEscPosRaster(
            qr.rgba,
            qr.width,
            qr.height,
          );

        return json({
          kind:
            'qr',
          base64:
            encodeBase64(
              raster,
            ),
          width:
            qr.width,
          height:
            qr.height,
        });
      }

      const imageBase64 =
        body.imageBase64
          ?.trim() ??
        '';

      if (!imageBase64) {
        return json(
          {
            error:
              'La imagen o el texto QR son obligatorios.',
          },
          400,
        );
      }

      const mimeType =
        (
          body.mimeType ??
          'image/jpeg'
        )
          .trim()
          .toLowerCase();

      if (
        mimeType !==
          'image/jpeg' &&
        mimeType !==
          'image/png'
      ) {
        return json(
          {
            error:
              'La función recibe imágenes PNG o JPEG procesadas.',
          },
          400,
        );
      }

      const decoded =
        decodeImage(
          imageBase64,
          mimeType,
        );

      const maxWidth =
        Math.min(
          Math.max(
            Number(
              body.maxWidth,
            ) ||
              384,
            1,
          ),
          576,
        );

      if (
        decoded.width >
        maxWidth
      ) {
        return json(
          {
            error:
              'La imagen debe llegar previamente redimensionada.',
          },
          400,
        );
      }

      const raster =
        createEscPosRaster(
          decoded.data as
            Uint8Array,
          decoded.width,
          decoded.height,
        );

      return json({
        kind:
          'image',
        base64:
          encodeBase64(
            raster,
          ),
        width:
          decoded.width,
        height:
          decoded.height,
      });
    } catch (error) {
      console.error(
        'promotion-ticket-image error:',
        error,
      );

      return json(
        {
          error:
            error instanceof
              Error
              ? error.message
              : 'No se pudo procesar la imagen o QR.',
        },
        500,
      );
    }
  },
);
