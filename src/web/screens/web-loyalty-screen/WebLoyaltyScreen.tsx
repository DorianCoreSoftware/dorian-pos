import React, {

  useEffect,

  useMemo,

  useState,

} from 'react';



import {

  ActivityIndicator,

  Image,

  Modal,

  Pressable,

  ScrollView,

  Text,

  View,

} from 'react-native';



import QRCode from 'qrcode';



import styles from './WebLoyaltyScreen.styles';

import { useBusiness } from '../../../context/BusinessContext';

import { activateMyWebRewards, isInvalidWebCustomerSessionError } from '../../services/web-customer/webCustomerService';

import { WebLoyaltyStatus, getWebLoyaltyStatus } from '../../services/web-loyalty/webLoyaltyService';

import { getSavedWebCustomerSessionToken, clearSavedWebCustomerSessionToken } from '../../utils/webCustomerStorage';



interface Props {

  onBack: () => void;

  onAccountPress: () => void;

}



function loadHtmlImage(

  src: string,

): Promise<HTMLImageElement> {

  return new Promise(

    (

      resolve,

      reject,

    ) => {

      const image =

        new window.Image();



      image.crossOrigin =

        'anonymous';



      image.onload =

        () => {

          resolve(

            image,

          );

        };



      image.onerror =

        () => {

          reject(

            new Error(

              'No se pudo cargar la imagen.',

            ),

          );

        };



      image.src =

        src;

    },

  );

}



function getLoyaltyTokenFromPath():

  | string

  | null {

  if (

    typeof window ===

    'undefined'

  ) {

    return null;

  }



  const match =

    window.location.pathname.match(

      /^\/recompensas\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/?$/i,

    );



  return match?.[1] ?? null;

}



export default function WebLoyaltyScreen({

  onBack,

  onAccountPress,

}: Props) {

  const {

    business,

    theme,

  } = useBusiness();



  const businessName =

    business?.identity.businessName ??

    'Dorian POS';



  const shortName =

    business?.identity.shortName ??

    businessName;



  const logoUrl =

    business?.identity.logoUrl;



  const rewardsLabel =

    `${shortName} Rewards`;



  const [

    status,

    setStatus,

  ] = useState<WebLoyaltyStatus | null>(

    null,

  );



  const [

    qrDataUrl,

    setQrDataUrl,

  ] = useState<string | null>(

    null,

  );



  const [

    activeQrToken,

    setActiveQrToken,

  ] = useState<string | null>(

    null,

  );



  const [

    loading,

    setLoading,

  ] = useState(true);



  const [

    accountRequired,

    setAccountRequired,

  ] = useState(false);



  const [

    errorMessage,

    setErrorMessage,

  ] = useState<string | null>(

    null,

  );


  const [

    selectedAvailableReward,

    setSelectedAvailableReward,

  ] = useState<

    WebLoyaltyStatus['rewards'][number] | null

  >(null);



  const availableRewards =

    useMemo(

      () =>

        status?.rewards.filter(

          reward =>

            reward.status ===

            'available',

        ) ?? [],

      [status],

    );



  const nextReward =

    useMemo(

      () =>

        status?.rewards

          .filter(

            reward =>

              reward.status ===

              'locked',

          )

          .sort(

            (a, b) =>

              a.requiredVisits -

              b.requiredVisits,

          )[0] ?? null,

      [status],

    );



  const loadStatus =

    async (

      qrToken: string,

    ): Promise<void> => {

      const result =

        await getWebLoyaltyStatus(

          qrToken,

        );



      setStatus(result);

      setActiveQrToken(qrToken);



      if (

        typeof window !==

        'undefined'

      ) {

        const qrValue =

          `${window.location.origin}/recompensas/${qrToken}`;



        const resultQr =

          await QRCode.toDataURL(

            qrValue,

            {

              width: 420,

              margin: 2,

              errorCorrectionLevel:

                'H',

            },

          );



        setQrDataUrl(resultQr);

      }

    };



  useEffect(

    () => {

      const bootstrap =

        async (): Promise<void> => {

          try {

            setErrorMessage(null);

            setAccountRequired(false);



            const routeToken =

              getLoyaltyTokenFromPath();



            if (routeToken) {

              await loadStatus(

                routeToken,

              );

              return;

            }



            const sessionToken =

              getSavedWebCustomerSessionToken();



            if (!sessionToken) {

              setAccountRequired(true);

              return;

            }



            const access =

              await activateMyWebRewards(

                sessionToken,

              );



            await loadStatus(

              access.qrToken,

            );

          } catch (error) {

            console.error(

              'Error cargando Recompensas:',

              error,

            );



            if (

              isInvalidWebCustomerSessionError(

                error,

              )

            ) {

              clearSavedWebCustomerSessionToken();

              setAccountRequired(true);

              return;

            }



            setErrorMessage(

              error instanceof Error

                ? error.message

                : 'No se pudieron cargar tus recompensas.',

            );

          } finally {

            setLoading(false);

          }

        };



      void bootstrap();

    },

    [],

  );



  useEffect(

    () => {

      if (

        !activeQrToken ||

        typeof window ===

        'undefined'

      ) {

        return;

      }



      let refreshing = false;



      const refresh =

        async (): Promise<void> => {

          if (refreshing) {

            return;

          }



          try {

            refreshing = true;



            const refreshed =

              await getWebLoyaltyStatus(

                activeQrToken,

              );



            setStatus(refreshed);

          } catch (error) {

            console.error(

              'Error actualizando Recompensas:',

              error,

            );

          } finally {

            refreshing = false;

          }

        };



      const interval =

        window.setInterval(

          () => {

            void refresh();

          },

          20000,

        );



      const handleFocus =

        (): void => {

          void refresh();

        };



      window.addEventListener(

        'focus',

        handleFocus,

      );



      return () => {

        window.clearInterval(

          interval,

        );



        window.removeEventListener(

          'focus',

          handleFocus,

        );

      };

    },

    [activeQrToken],

  );



  const handleDownloadStyledQr =

    async (): Promise<void> => {

      if (

        !qrDataUrl ||

        !status ||

        typeof document ===

          'undefined' ||

        typeof window ===

          'undefined'

      ) {

        return;

      }



      try {

        setErrorMessage(

          null,

        );



        const canvas =

          document.createElement(

            'canvas',

          );



        const ctx =

          canvas.getContext(

            '2d',

          );



        if (!ctx) {

          throw new Error(

            'No se pudo generar la imagen.',

          );

        }



        const width =

          1080;



        const height =

          1350;



        canvas.width =

          width;



        canvas.height =

          height;



        // Fondo

        ctx.fillStyle =

          '#F7F7F7';



        ctx.fillRect(

          0,

          0,

          width,

          height,

        );



        // Tarjeta

        const cardX =

          35;



        const cardY =

          35;



        const cardWidth =

          width - 70;



        const cardHeight =

          height - 70;



        ctx.fillStyle =

          '#FFFFFF';



        ctx.beginPath();



        ctx.roundRect(

          cardX,

          cardY,

          cardWidth,

          cardHeight,

          38,

        );



        ctx.fill();



        ctx.strokeStyle =

          '#DDDDDD';



        ctx.lineWidth =

          3;



        ctx.stroke();



        // Header

        const headerX =

          cardX;



        const headerY =

          cardY;



        const headerWidth =

          cardWidth;



        const headerHeight =

          170;



        ctx.fillStyle =

          theme.primary;



        ctx.beginPath();



        ctx.roundRect(

          headerX,

          headerY,

          headerWidth,

          headerHeight,

          [

            38,

            38,

            0,

            0,

          ],

        );



        ctx.fill();



        // Logo

        if (logoUrl) {

          try {

            const logo =

              await loadHtmlImage(

                logoUrl,

              );



            const maxLogoWidth =

              145;



            const maxLogoHeight =

              125;



            const logoRatio =

              Math.min(

                maxLogoWidth /

                  logo.naturalWidth,



                maxLogoHeight /

                  logo.naturalHeight,

              );



            const logoWidth =

              logo.naturalWidth *

              logoRatio;



            const logoHeight =

              logo.naturalHeight *

              logoRatio;



            const logoX =

              headerX + 55;



            const logoY =

              headerY +

              (

                headerHeight -

                logoHeight

              ) / 2;



            ctx.drawImage(

              logo,

              logoX,

              logoY,

              logoWidth,

              logoHeight,

            );

          } catch (error) {

            console.error(

              'ERROR CARGANDO LOGO REWARDS:',

              error,

            );

          }

        }



        // Título

        ctx.fillStyle =

          '#111111';



        ctx.textAlign =

          'center';



        ctx.textBaseline =

          'middle';



        ctx.font =

          '900 36px Arial';



        const titleStartX =

          headerX + 235;



        const titleEndX =

          headerX +

          headerWidth -

          40;



        const titleCenterX =

          (

            titleStartX +

            titleEndX

          ) / 2;



        ctx.fillText(

          'PROGRAMA DE RECOMPENSAS',

          titleCenterX,

          headerY +

          headerHeight / 2,

        );



        // Cliente

        ctx.textAlign =

          'center';



        ctx.textBaseline =

          'alphabetic';



        ctx.fillStyle =

          '#111111';



        ctx.font =

          '900 43px Arial';



        const customerName =

          status.customer.name.length >

            28

            ? `${status.customer.name.slice(

                0,

                28,

              )}...`

            : status.customer.name;



        ctx.fillText(

          customerName,

          width / 2,

          295,

        );



        ctx.fillStyle =

          '#777777';



        ctx.font =

          '500 23px Arial';



        ctx.fillText(

          `Cliente ${rewardsLabel}`,

          width / 2,

          333,

        );



        // Separador

        ctx.strokeStyle =

          '#EEEEEE';



        ctx.lineWidth =

          2;



        ctx.beginPath();



        ctx.moveTo(

          160,

          415,

        );



        ctx.lineTo(

          width - 160,

          415,

        );



        ctx.stroke();



        // QR

        const qrImage =

          await loadHtmlImage(

            qrDataUrl,

          );



        const qrSize =

          610;



        const qrX =

          width / 2 -

          qrSize / 2;



        const qrY =

          465;



        const qrPadding =

          35;



        ctx.fillStyle =

          '#F2F2F2';



        ctx.beginPath();



        ctx.roundRect(

          qrX -

          qrPadding,



          qrY -

          qrPadding,



          qrSize +

          qrPadding * 2,



          qrSize +

          qrPadding * 2,



          28,

        );



        ctx.fill();



        ctx.fillStyle =

          '#FFFFFF';



        ctx.fillRect(

          qrX,

          qrY,

          qrSize,

          qrSize,

        );



        ctx.drawImage(

          qrImage,

          qrX,

          qrY,

          qrSize,

          qrSize,

        );



        // Texto

        ctx.fillStyle =

          '#111111';



        ctx.font =

          '900 29px Arial';



        ctx.fillText(

          'Muéstralo en caja',

          width / 2,

          1170,

        );



        ctx.fillStyle =

          '#666666';



        ctx.font =

          '500 21px Arial';



        ctx.fillText(

          'Escanéalo en cada visita para acumular recompensas',

          width / 2,

          1208,

        );



        // Footer

        ctx.fillStyle =

          '#111111';



        ctx.beginPath();



        ctx.roundRect(

          355,

          1247,

          370,

          48,

          24,

        );



        ctx.fill();



        ctx.fillStyle =

          theme.primary;



        ctx.font =

          '800 18px Arial';



        ctx.fillText(

          rewardsLabel.toUpperCase(),

          width / 2,

          1278,

        );



        // Descarga

        const imageUrl =

          canvas.toDataURL(

            'image/png',

          );



        const link =

          document.createElement(

            'a',

          );



        link.href =

          imageUrl;



        link.download =

          'dorian-rewards.png';



        document.body.appendChild(

          link,

        );



        link.click();



        document.body.removeChild(

          link,

        );

      } catch (error) {

        console.error(

          'Error generando QR personalizado:',

          error,

        );



        setErrorMessage(

          'No se pudo generar la imagen del QR.',

        );

      }

    };



  if (loading) {

    return (

      <View

        style={[

          styles.loadingContainer,

          {

            backgroundColor:

              theme.background,

          },

        ]}

      >

        <ActivityIndicator

          size="large"

          color={theme.primary}

        />



        <Text

          style={[

            styles.loadingText,

            {

              color:

                theme.textMuted,

            },

          ]}

        >

          Cargando recompensas...

        </Text>

      </View>

    );

  }



  return (

    <ScrollView

      style={[

        styles.container,

        {

          backgroundColor:

            theme.background,

        },

      ]}

      contentContainerStyle={

        styles.contentContainer

      }

    >

      <View

        style={styles.header}

      >

        <Pressable

          style={styles.backButton}

          onPress={onBack}

        >

          <Text

            style={[

              styles.backButtonText,

              {

                color:

                  theme.primary,

              },

            ]}

          >

            ← Menú

          </Text>

        </Pressable>



        <Text

          style={[

            styles.brand,

            {

              color:

                theme.primary,

            },

          ]}

        >

          {businessName}

        </Text>



        <Text

          style={[

            styles.title,

            {

              color:

                theme.text,

            },

          ]}

        >

          Recompensas

        </Text>



        <Text

          style={[

            styles.subtitle,

            {

              color:

                theme.textMuted,

            },

          ]}

        >

          Acumula visitas y desbloquea premios.

        </Text>

      </View>



      {accountRequired ? (

        <View

          style={[

            styles.registerCard,

            {

              backgroundColor:

                theme.surface,

              borderColor:

                theme.border,

            },

          ]}

        >

          <Text

            style={[

              styles.sectionTitle,

              {

                color:

                  theme.text,

              },

            ]}

          >

            Inicia sesión para ver tus recompensas

          </Text>



          <Text

            style={[

              styles.sectionText,

              {

                color:

                  theme.textMuted,

              },

            ]}

          >

            Tu cuenta de pedidos también es tu cuenta de recompensas. No necesitas registrarte otra vez.

          </Text>



          <Pressable

            style={[

              styles.primaryButton,

              {

                backgroundColor:

                  theme.primary,

              },

            ]}

            onPress={onAccountPress}

          >

            <Text

              style={[

                styles.primaryButtonText,

                {

                  color:

                    theme.onPrimary,

                },

              ]}

            >

              Iniciar sesión / Crear cuenta

            </Text>

          </Pressable>

        </View>

      ) : errorMessage ? (

        <View

          style={[

            styles.registerCard,

            {

              backgroundColor:

                theme.surface,

              borderColor:

                theme.border,

            },

          ]}

        >

          <Text

            style={[

              styles.sectionTitle,

              {

                color:

                  theme.text,

              },

            ]}

          >

            Recompensas no disponibles

          </Text>



          <Text

            style={[

              styles.errorText,

              {

                color:

                  theme.danger,

              },

            ]}

          >

            {errorMessage}

          </Text>

        </View>

      ) : status ? (

        <>

          <View

            style={[

              styles.customerCard,

              {

                backgroundColor:

                  theme.surface,

                borderColor:

                  theme.border,

              },

            ]}

          >

            <Text

              style={[

                styles.customerHello,

                {

                  color:

                    theme.text,

                },

              ]}

            >

              Hola, {status.customer.name}

            </Text>



            <Text

              style={[

                styles.visitCount,

                {

                  color:

                    theme.primary,

                },

              ]}

            >

              {status.customer.totalVisits}

            </Text>



            <Text

              style={[

                styles.visitLabel,

                {

                  color:

                    theme.textMuted,

                },

              ]}

            >

              {status.customer.totalVisits === 1

                ? 'visita acumulada'

                : 'visitas acumuladas'}

            </Text>



            {availableRewards.length > 0 ? (

              <View

                style={[

                  styles.availableBanner,

                  {

                    borderColor:

                      theme.primary,

                    backgroundColor:

                      theme.surfaceAlt,

                  },

                ]}

              >

                <Text

                  style={[

                    styles.availableBannerTitle,

                    {

                      color:

                        theme.primary,

                    },

                  ]}

                >

                  🎁 Tienes recompensa

                </Text>



                <Text

                  style={[

                    styles.availableBannerText,

                    {

                      color:

                        theme.text,

                    },

                  ]}

                >

                  {availableRewards.length === 1

                    ? 'Tienes 1 premio disponible para canjear.'

                    : `Tienes ${availableRewards.length} premios disponibles para canjear.`}

                </Text>

              </View>

            ) : null}



            {nextReward ? (

              <View

                style={[

                  styles.progressCard,

                  {

                    borderTopColor:

                      theme.border,

                  },

                ]}

              >

                <Text

                  style={[

                    styles.progressTitle,

                    {

                      color:

                        theme.textMuted,

                    },

                  ]}

                >

                  Próxima recompensa

                </Text>



                <Text

                  style={[

                    styles.progressReward,

                    {

                      color:

                        theme.text,

                    },

                  ]}

                >

                  {nextReward.name}

                </Text>



                <Text

                  style={[

                    styles.progressText,

                    {

                      color:

                        theme.textMuted,

                    },

                  ]}

                >

                  Te faltan {nextReward.visitsRemaining}{' '}

                  {nextReward.visitsRemaining === 1

                    ? 'visita'

                    : 'visitas'}

                </Text>



                <View

                  style={[

                    styles.progressTrack,

                    {

                      backgroundColor:

                        theme.surfaceAlt,

                    },

                  ]}

                >

                  <View

                    style={[

                      styles.progressFill,

                      {

                        backgroundColor:

                          theme.primary,

                        width:

                          `${Math.min(

                            100,

                            Math.max(

                              0,

                              (

                                status.customer.totalVisits /

                                nextReward.requiredVisits

                              ) * 100,

                            ),

                          )}%`,

                      },

                    ]}

                  />

                </View>



                <Text

                  style={[

                    styles.progressCounter,

                    {

                      color:

                        theme.textMuted,

                    },

                  ]}

                >

                  {status.customer.totalVisits} / {nextReward.requiredVisits}

                </Text>

              </View>

            ) : null}

          </View>



          <View

            style={[

              styles.qrCard,

              {

                backgroundColor:

                  theme.surface,

                borderColor:

                  theme.border,

              },

            ]}

          >

            <Text

              style={[

                styles.sectionTitle,

                {

                  color:

                    theme.text,

                },

              ]}

            >

              Tu QR

            </Text>



            <Text

              style={[

                styles.sectionText,

                {

                  color:

                    theme.textMuted,

                },

              ]}

            >

              Muéstralo en caja para acumular visitas y canjear recompensas.

            </Text>



            {qrDataUrl ? (

              <View

                style={styles.qrContainer}

              >

                <Image

                  source={{

                    uri: qrDataUrl,

                  }}

                  style={styles.qrImage}

                />

              </View>

            ) : null}



            <Pressable

              style={[

                styles.downloadQrButton,

                {

                  backgroundColor:

                    theme.primary,

                },

              ]}

              onPress={() => {

                void handleDownloadStyledQr();

              }}

            >

              <Text

                style={[

                  styles.downloadQrButtonText,

                  {

                    color:

                      theme.onPrimary,

                  },

                ]}

              >

                Descargar mi QR

              </Text>

            </Pressable>



            <Text

              style={[

                styles.downloadQrHint,

                {

                  color:

                    theme.textMuted,

                },

              ]}

            >

              Guárdalo en tu galería para tenerlo disponible rápidamente.

            </Text>

          </View>



          <View

            style={[

              styles.rewardsCard,

              {

                backgroundColor:

                  theme.surface,

                borderColor:

                  theme.border,

              },

            ]}

          >

            <Text

              style={[

                styles.sectionTitle,

                {

                  color:

                    theme.text,

                },

              ]}

            >

              Tus recompensas

            </Text>



            {status.rewards.map(

              reward => {

                const available =

                  reward.status ===

                  'available';



                const redeemed =

                  reward.status ===

                  'redeemed';


                const rewardImageUrl =

                  (

                    reward as typeof reward & {

                      imageUrl?: string | null;

                    }

                  ).imageUrl ??

                  null;



                return (

                  <Pressable

                    key={reward.id}

                    disabled={!available}

                    accessibilityRole={

                      available

                        ? 'button'

                        : undefined

                    }

                    accessibilityLabel={

                      available

                        ? `Ver cómo reclamar ${reward.name}`

                        : undefined

                    }

                    onPress={

                      available

                        ? () =>

                            setSelectedAvailableReward(

                              reward,

                            )

                        : undefined

                    }

                    style={[

                      styles.rewardRow,

                      {

                        borderColor:

                          theme.border,

                      },

                      available && {

                        borderColor:

                          theme.primary,

                        backgroundColor:

                          theme.surfaceAlt,

                      },

                      redeemed &&

                        styles.rewardRowRedeemed,

                    ]}

                  >

                    <View

                      style={{

                        width: 56,

                        height: 56,

                        borderRadius: 28,

                        borderWidth: 1,

                        borderColor:

                          theme.border,

                        backgroundColor:

                          theme.surfaceAlt,

                        overflow: 'hidden',

                        alignItems: 'center',

                        justifyContent: 'center',

                        flexShrink: 0,

                      }}

                    >

                      {rewardImageUrl ? (

                        <Image

                          source={{

                            uri:

                              rewardImageUrl,

                          }}

                          style={{

                            width: '100%',

                            height: '100%',

                          }}

                          resizeMode="cover"

                        />

                      ) : (

                        <Text

                          style={{

                            fontSize: 22,

                          }}

                        >

                          🎁

                        </Text>

                      )}

                    </View>



                    <View

                      style={styles.rewardContent}

                    >

                      <Text

                        style={[

                          styles.rewardName,

                          {

                            color:

                              theme.text,

                          },

                        ]}

                      >

                        {reward.name}

                      </Text>



                      {reward.description ? (

                        <Text

                          style={[

                            styles.rewardDescription,

                            {

                              color:

                                theme.textMuted,

                            },

                          ]}

                        >

                          {reward.description}

                        </Text>

                      ) : null}



                      <Text

                        style={[

                          styles.rewardRequirement,

                          {

                            color:

                              theme.primary,

                          },

                        ]}

                      >

                        {reward.requiredVisits}{' '}

                        {reward.requiredVisits === 1

                          ? 'visita'

                          : 'visitas'}

                      </Text>

                    </View>



                    <View

                      style={styles.rewardStatusContainer}

                    >

                      <Text

                        style={[

                          styles.rewardStatus,

                          {

                            color:

                              available

                                ? theme.primary

                                : redeemed

                                  ? '#65C978'

                                  : theme.textMuted,

                          },

                        ]}

                      >

                        {available

                          ? '🎁 Disponible'

                          : redeemed

                            ? '✓ Canjeada'

                            : `🔒 Faltan ${reward.visitsRemaining}`}

                      </Text>

                    </View>

                  </Pressable>

                );

              },

            )}

          </View>



          <View

            style={[

              styles.howItWorksCard,

              {

                backgroundColor:

                  theme.surface,

                borderColor:

                  theme.border,

              },

            ]}

          >

            <Text

              style={[

                styles.sectionTitle,

                {

                  color:

                    theme.text,

                },

              ]}

            >

              ¿Cómo funciona?

            </Text>



            <Text

              style={[

                styles.stepText,

                {

                  color:

                    theme.textMuted,

                },

              ]}

            >

              1. Haz tu compra en {businessName}.

            </Text>



            <Text

              style={[

                styles.stepText,

                {

                  color:

                    theme.textMuted,

                },

              ]}

            >

              2. Muestra tu QR al momento de pagar.

            </Text>



            <Text

              style={[

                styles.stepText,

                {

                  color:

                    theme.textMuted,

                },

              ]}

            >

              3. Acumula visitas y desbloquea premios.

            </Text>



            <Text

              style={[

                styles.stepText,

                {

                  color:

                    theme.textMuted,

                },

              ]}

            >

              4. Cuando un premio esté disponible, solicítalo en el local.

            </Text>

          </View>



          <Pressable

            style={styles.resetButton}

            onPress={onAccountPress}

          >

            <Text

              style={[

                styles.resetButtonText,

                {

                  color:

                    theme.textMuted,

                },

              ]}

            >

              Ir a Mi cuenta

            </Text>

          </Pressable>

        </>

      ) : null}

      <Modal

        visible={

          selectedAvailableReward !== null

        }

        transparent

        animationType="fade"

        onRequestClose={() =>

          setSelectedAvailableReward(null)

        }

      >

        <View

          style={{

            flex: 1,

            backgroundColor: 'rgba(0, 0, 0, 0.72)',

            alignItems: 'center',

            justifyContent: 'center',

            paddingHorizontal: 20,

          }}

        >

          <View

            style={{

              width: '100%',

              maxWidth: 440,

              backgroundColor:

                theme.surface,

              borderWidth: 1,

              borderColor:

                theme.border,

              borderRadius: 18,

              padding: 24,

            }}

          >

            <Text

              style={{

                color:

                  theme.primary,

                fontSize: 14,

                fontWeight: '900',

                textTransform: 'uppercase',

                marginBottom: 8,

              }}

            >

              🎁 Recompensa disponible

            </Text>



            <Text

              style={{

                color:

                  theme.text,

                fontSize: 22,

                fontWeight: '900',

              }}

            >

              {selectedAvailableReward?.name}

            </Text>



            <Text

              style={{

                color:

                  theme.textMuted,

                fontSize: 14,

                lineHeight: 21,

                marginTop: 12,

              }}

            >

              Acude a sucursal para reclamar tu premio. Al canjearlo podremos registrar tu siguiente visita.

            </Text>



            <Pressable

              accessibilityRole="button"

              accessibilityLabel="Entendido"

              onPress={() =>

                setSelectedAvailableReward(null)

              }

              style={{

                minHeight: 48,

                marginTop: 22,

                borderRadius: 10,

                backgroundColor:

                  theme.primary,

                alignItems: 'center',

                justifyContent: 'center',

                paddingHorizontal: 18,

              }}

            >

              <Text

                style={{

                  color:

                    theme.onPrimary,

                  fontSize: 14,

                  fontWeight: '900',

                }}

              >

                Entendido

              </Text>

            </Pressable>

          </View>

        </View>

      </Modal>


    </ScrollView>

  );

}
