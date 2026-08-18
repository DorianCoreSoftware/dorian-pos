const fs =
    require('fs');

const path =
    require('path');

const sharp =
    require('sharp');

const ASSETS = [
    {
        name:
            'BURGER_KONG_LOGO',

        file:
            'BurgerKongWOFondo.png',

        width:
            320,

        mode:
            'dither',

        brightness:
            1.25,

        contrast:
            1.05,
    },
    {
        name:
            'BURGER_KONG_PROMO',

        file:
            'BurgerKongBN.png',

        width:
            360,

        mode:
            'threshold',

        threshold:
            165,
    },
    {
        name:
            'LUCKY_DORIAN',

        file:
            'Lucky-Dorian.png',

        width:
            340,

        mode:
            'dither',

        brightness:
            1.25,

        contrast:
            1.05,
    },
];

const assetsDirectory =
    path.resolve(
        __dirname,
        '../assets',
    );

const outputFile =
    path.resolve(
        __dirname,
        '../src/generated/printerAssets.ts',
    );

async function generateEscPosImage(
    filePath,
    config,
) {
    let pipeline =
        sharp(
            filePath,
        )
            .flatten({
                background:
                    '#FFFFFF',
            })
            .resize({
                width:
                    config.width,

                withoutEnlargement:
                    true,
            })
            .grayscale();

    /*
     * Ajustes especiales
     * para fotografía.
     */
    if (
        config.mode ===
        'dither'
    ) {
        pipeline =
            pipeline
                .modulate({
                    brightness:
                        config.brightness ??
                        1,
                })
                .linear(
                    config.contrast ??
                    1,
                    128 *
                    (
                        1 -
                        (
                            config.contrast ??
                            1
                        )
                    ),
                );
    }

    const {
        data,
        info,
    } =
        await pipeline
            .raw()
            .toBuffer({
                resolveWithObject:
                    true,
            });

    const width =
        info.width;

    const height =
        info.height;

    const grayscalePixels =
        Float32Array.from(
            data,
        );

    /*
     * ==================================
     * MONOCROMO
     * ==================================
     */

    if (
        config.mode ===
        'threshold'
    ) {
        const threshold =
            config.threshold ??
            165;

        for (
            let i = 0;
            i <
            grayscalePixels.length;
            i += 1
        ) {
            grayscalePixels[i] =
                grayscalePixels[i] <
                    threshold
                    ? 0
                    : 255;
        }
    } else {
        /*
         * Floyd-Steinberg dithering.
         *
         * Permite simular grises
         * mediante puntos negros
         * y blancos.
         */
        applyFloydSteinberg(
            grayscalePixels,
            width,
            height,
        );
    }

    const bytesPerRow =
        Math.ceil(
            width / 8,
        );

    const raster =
        Buffer.alloc(
            bytesPerRow *
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
            const pixel =
                grayscalePixels[
                y * width +
                x
                ];

            if (
                pixel <
                128
            ) {
                const byteIndex =
                    y *
                    bytesPerRow +
                    Math.floor(
                        x / 8,
                    );

                const bit =
                    7 -
                    (
                        x %
                        8
                    );

                raster[
                    byteIndex
                ] |=
                    1 << bit;
            }
        }
    }

    /*
     * GS v 0
     *
     * 1D 76 30 00
     * xL xH
     * yL yH
     */
    const header =
        Buffer.from([
            0x1d,
            0x76,
            0x30,
            0x00,

            bytesPerRow &
            0xff,

            (
                bytesPerRow >>
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

    return {
        width,
        height,

        bytes:
            Buffer.concat([
                header,
                raster,
            ]),
    };
}

function applyFloydSteinberg(
    pixels,
    width,
    height,
) {
    const clamp = (
        value,
    ) =>
        Math.max(
            0,
            Math.min(
                255,
                value,
            ),
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
            const index =
                y *
                width +
                x;

            const oldPixel =
                pixels[
                index
                ];

            const newPixel =
                oldPixel <
                    128
                    ? 0
                    : 255;

            pixels[
                index
            ] =
                newPixel;

            const error =
                oldPixel -
                newPixel;

            /*
             * Derecha
             */
            if (
                x + 1 <
                width
            ) {
                const right =
                    index +
                    1;

                pixels[
                    right
                ] =
                    clamp(
                        pixels[
                        right
                        ] +
                        error *
                        (
                            7 /
                            16
                        ),
                    );
            }

            /*
             * Abajo izquierda
             */
            if (
                y + 1 <
                height &&
                x >
                0
            ) {
                const bottomLeft =
                    index +
                    width -
                    1;

                pixels[
                    bottomLeft
                ] =
                    clamp(
                        pixels[
                        bottomLeft
                        ] +
                        error *
                        (
                            3 /
                            16
                        ),
                    );
            }

            /*
             * Abajo
             */
            if (
                y + 1 <
                height
            ) {
                const bottom =
                    index +
                    width;

                pixels[
                    bottom
                ] =
                    clamp(
                        pixels[
                        bottom
                        ] +
                        error *
                        (
                            5 /
                            16
                        ),
                    );
            }

            /*
             * Abajo derecha
             */
            if (
                y + 1 <
                height &&
                x + 1 <
                width
            ) {
                const bottomRight =
                    index +
                    width +
                    1;

                pixels[
                    bottomRight
                ] =
                    clamp(
                        pixels[
                        bottomRight
                        ] +
                        error *
                        (
                            1 /
                            16
                        ),
                    );
            }
        }
    }
}

async function main() {
    const generated =
        [];

    for (
        const asset of
        ASSETS
    ) {
        const filePath =
            path.join(
                assetsDirectory,
                asset.file,
            );

        const result =
            await generateEscPosImage(
                filePath,
                asset,
            );

        console.log(
            `${asset.file}: ${result.width}x${result.height} - ${asset.mode}`,
        );

        generated.push(`
export const ${asset.name} = {
  width: ${result.width},
  height: ${result.height},
  base64: '${result.bytes.toString(
            'base64',
        )}',
} as const;
`);
    }

    fs.mkdirSync(
        path.dirname(
            outputFile,
        ),
        {
            recursive:
                true,
        },
    );

    fs.writeFileSync(
        outputFile,
        `/*
 * Archivo generado automáticamente.
 *
 * No editar manualmente.
 */

${generated.join(
            '\n',
        )}
`,
    );

    console.log(
        `Generado: ${outputFile}`,
    );
}

main().catch(
    (
        error,
    ) => {
        console.error(
            error,
        );

        process.exit(
            1,
        );
    },
);