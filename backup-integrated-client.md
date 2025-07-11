<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
      name="description"
      content="Formulário para solicitação de mockup personalizado de chinelos - HUD LAB"
    />
    <meta name="robots" content="noindex" />
    <title>Formulário de Solicitação - HUD LAB</title>
    <style>
      @import url(https://fonts.bunny.net/css?family=poppins:400,700);

      body {
        font-family: "Poppins", sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 100%;
        margin: 0 auto;
        padding: 0;
        background-color: transparent;
        overflow-x: hidden;
      }

      /* Container para o formulário */
      .main-container {
        width: 100%;
        max-width: 500px;
        margin: 0 auto;
        padding: 10px;
        box-sizing: border-box;
      }

      .form-container {
        background-color: #ffffff;
        border-radius: 24px;
        padding: 20px;
        margin-top: 25px;
        box-sizing: border-box;
      }

      .form-group {
        margin-bottom: 20px;
      }

      label {
        display: block;
        margin-bottom: 8px;
        font-weight: 700;
        font-size: 14px;
        color: #000000;
      }

      input[type="text"],
      input[type="email"],
      input[type="tel"],
      select {
        width: 100%;
        padding: 12px;
        border: 1px solid #979797;
        border-radius: 4px;
        font-size: 14px;
        transition: border-color 0.3s;
        box-sizing: border-box;
        font-family: "Poppins", sans-serif;
      }

      input[type="text"]:focus,
      input[type="email"]:focus,
      input[type="tel"]:focus,
      select:focus {
        border-color: #3498db;
        outline: none;
        box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
      }

      .file-input-container {
        position: relative;
        margin-top: 10px;
      }

      .file-input-label {
        display: block;
        background-color: #e9ecef;
        color: #495057;
        padding: 12px 20px;
        border-radius: 4px;
        cursor: pointer;
        border: 1px solid #ced4da;
        width: 100%;
        box-sizing: border-box;
        text-align: center;
        transition: all 0.3s;
      }

      .file-input-label:hover {
        background-color: #dde2e6;
      }

      .file-input {
        position: absolute;
        left: -9999px;
      }

      .file-name {
        margin-top: 8px;
        font-size: 14px;
        color: #6c757d;
      }

      button {
        background-color: #0dc220;
        color: white;
        border: none;
        padding: 14px 20px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 400;
        width: 100%;
        box-sizing: border-box;
        display: block;
        transition: background-color 0.3s;
        font-family: "Poppins", sans-serif;
      }

      button:hover {
        background-color: #0aa51b;
      }

      .loading {
        display: none;
        text-align: center;
        margin: 20px 0;
        padding: 20px;
        background-color: rgba(255, 255, 255, 0.9);
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      }

      .loading-spinner {
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 0 auto 15px;
      }

      .loading-details {
        font-size: 14px;
        color: #666;
        margin-top: 5px;
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      .error-message {
        color: #e74c3c;
        font-weight: 600;
        margin-top: 8px;
        padding: 8px;
        border-left: 3px solid #e74c3c;
        background-color: rgba(231, 76, 60, 0.1);
        border-radius: 3px;
        display: none;
      }

      /* Estilo para o disclaimer */
      .disclaimer-box {
        background-color: #fff3cd;
        border-left: 4px solid #ffc107;
        color: #856404;
        padding: 12px 15px;
        margin: 15px 0;
        border-radius: 4px;
        font-size: 14px;
        line-height: 1.5;
        width: 100%;
        box-sizing: border-box;
        text-align: justify;
      }

      .disclaimer-box strong {
        color: #856404;
      }

      /* Estilos específicos do ActiveCampaign */
      ._form-content {
        width: 100%;
      }

      ._form_element {
        margin-bottom: 10px;
      }

      ._form-label {
        font-weight: 700;
        margin-bottom: 5px;
        display: block;
        font-size: 14px;
        color: #000000;
      }

      ._field-wrapper {
        width: 100%;
      }

      ._form-thank-you {
        display: none;
        text-align: center;
        font-size: 18px;
        margin-top: 20px;
      }
    </style>

  </head>
  <body>
    <div class="main-container">
      <div class="form-container">
        <form
          method="POST"
          action="https://hudlabprivatelabel.activehosted.com/proc.php"
          id="mockupForm"
          class="_form _form_1 _inline-form _dark"
          novalidate
        >
          <input type="hidden" name="u" value="1" />
          <input type="hidden" name="f" value="1" />
          <input type="hidden" name="s" />
          <input type="hidden" name="c" value="0" />
          <input type="hidden" name="m" value="0" />
          <input type="hidden" name="act" value="sub" />
          <input type="hidden" name="v" value="2" />
          <input
            type="hidden"
            name="or"
            value="9241ef23d5336af6b77472dcf15f770c"
          />

          <!-- Campos para UTM -->
          <input type="hidden" name="field[2]" id="utm_source" value="" />
          <input type="hidden" name="field[3]" id="utm_medium" value="" />
          <input type="hidden" name="field[4]" id="utm_campaign" value="" />
          <input type="hidden" name="field[5]" id="utm_term" value="" />
          <input type="hidden" name="field[6]" id="utm_content" value="" />

          <!-- Campos para mockup URLs -->
          <input type="hidden" name="field[41]" id="mockup_url" value="" />
          <input type="hidden" name="field[42]" id="mockup_logotipo" value="" />

          <div class="_form-content">
            <div class="_form_element _full_width">
              <label for="fullname" class="_form-label"></label>
              <div class="_field-wrapper">
                <input
                  type="text"
                  id="fullname"
                  name="fullname"
                  placeholder="Nome*"
                  required
                />
                <div class="error-message" id="nameError">
                  Por favor, informe seu nome.
                </div>
              </div>
            </div>

            <div class="_form_element _full_width">
              <label for="phone" class="_form-label"></label>
              <div class="_field-wrapper">
                <input
                  type="text"
                  id="phone"
                  name="phone"
                  placeholder="Telefone/Whats com DDD*"
                  required
                />
                <div class="error-message" id="phoneError">
                  Por favor, informe seu telefone com DDD.
                </div>
              </div>
            </div>

            <div class="_form_element _full_width">
              <label for="email" class="_form-label"></label>
              <div class="_field-wrapper">
                <input
                  type="text"
                  id="email"
                  name="email"
                  placeholder="E-mail*"
                  required
                />
                <div class="error-message" id="emailError">
                  Por favor, insira um email válido.
                </div>
              </div>
            </div>

            <div class="_form_element _full_width">
              <label for="field[7]" class="_form-label">
                Informe seu Segmento de Negócio
              </label>
              <div class="_field-wrapper">
                <select name="field[7]" id="field[7]">
                  <option selected></option>
                  <option value="Marca de Roupa">Marca de Roupa</option>
                  <option value="Marca de Calçado">Marca de Calçado</option>
                  <option value="Time de Futebol ou Outro Esporte">
                    Time de Futebol ou Outro Esporte
                  </option>
                  <option value="Atlética Universitária">
                    Atlética Universitária
                  </option>
                  <option value="Marca de Cosméticos e Estética">
                    Marca de Cosméticos e Estética
                  </option>
                  <option value="Igreja ou Instituição Religiosa">
                    Igreja ou Instituição Religiosa
                  </option>
                  <option value="Empresa em Geral">Empresa em Geral</option>
                  <option value="Negócio Local">Negócio Local</option>
                  <option value="Academia/Crossfit/Grupo de Corrida">
                    Academia/Crossfit/Grupo de Corrida
                  </option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
            </div>

            <!-- Componente de upload de arquivo -->
            <div class="_form_element _full_width">
              <label for="logo" class="_form-label">Logotipo:</label>
              <div class="file-input-container">
                <label for="logo" class="file-input-label"
                  >Clique ou arraste aqui seu arquivo JPG, PNG ou PDF</label
                >
                <input
                  type="file"
                  id="logo"
                  name="logo"
                  accept=".png,.jpg,.jpeg,.pdf"
                  class="file-input"
                  required
                />
                <div class="file-name" id="fileName">
                  Nenhum arquivo selecionado
                </div>
              </div>
              <div class="error-message" id="logoError">
                Por favor, selecione um arquivo PNG, JPG ou PDF.
              </div>
            </div>

            <!-- Disclaimer sobre o upload de logo obrigatório -->
            <div class="disclaimer-box">
              <p>
                <strong>Atenção:</strong> O upload do arquivo de logo é
                obrigatório para a geração do mockup. Por favor, selecione um
                arquivo PNG, JPG ou PDF antes de enviar o formulário. Tamanho
                máximo para arquivos: 2MB.
              </p>
            </div>

            <div class="_button-wrapper _full_width">
              <button id="_form_1_submit" class="_submit" type="submit">
                Enviar
              </button>
            </div>
          </div>

          <div class="_form-thank-you" style="display: none"></div>
        </form>
      </div>

      <!-- Indicador de carregamento -->
      <div class="loading" id="loadingIndicator">
        <div class="loading-spinner"></div>
        <p>Gerando seu mockup personalizado, por favor aguarde...</p>
        <p class="loading-details">Este processo pode levar até 15 segundos.</p>
      </div>
    </div>

    <script>
      document.addEventListener("DOMContentLoaded", function () {
        const form = document.getElementById("mockupForm");
        const emailError = document.getElementById("emailError");
        const logoError = document.getElementById("logoError");
        const fileInput = document.getElementById("logo");
        const fileName = document.getElementById("fileName");
        const loadingIndicator = document.getElementById("loadingIndicator");
        // Adicionar referências para os novos erros
        const nameError = document.getElementById("nameError");
        const phoneError = document.getElementById("phoneError");

        // Função para redirecionar a página pai (se estiver em um iframe)
        function redirectParentPage(url) {
          if (window.parent && window.parent !== window) {
            // Estamos em um iframe, redirecionar a página pai
            window.parent.location.href = url;
          } else {
            // Não estamos em um iframe, redirecionar esta janela
            window.location.href = url;
          }
        }

        // Adicionar listener para receber UTMs da página pai
        window.addEventListener("message", function (event) {
          // Verificar origem para segurança - domínio da HUD LAB
          const allowedOrigins = [
            "https://hudlab.com.br",
            "http://hudlab.com.br",
            "https://www.hudlab.com.br",
            "http://www.hudlab.com.br",
          ];

          // Verificar se a mensagem vem de uma origem confiável
          if (!allowedOrigins.includes(event.origin)) {
            console.log(
              "Mensagem recebida de origem não confiável:",
              event.origin
            );
            return;
          }

          // Verificar se a mensagem contém dados UTM
          if (event.data && event.data.type === "UTM_PARAMS") {
            console.log(
              "Parâmetros UTM recebidos da página pai:",
              event.data.utmParams
            );
            const utmParams = event.data.utmParams;

            // Preencher campos ocultos com valores UTM
            if (utmParams.utm_source)
              document.getElementById("utm_source").value =
                utmParams.utm_source;
            if (utmParams.utm_medium)
              document.getElementById("utm_medium").value =
                utmParams.utm_medium;
            if (utmParams.utm_campaign)
              document.getElementById("utm_campaign").value =
                utmParams.utm_campaign;
            if (utmParams.utm_term)
              document.getElementById("utm_term").value = utmParams.utm_term;
            if (utmParams.utm_content)
              document.getElementById("utm_content").value =
                utmParams.utm_content;

            console.log("Campos UTM preenchidos no formulário");
          }
        });

        // Enviar mensagem para a página pai informando que o iframe está pronto
        console.log(
          "Iframe carregado, enviando mensagem de pronto para a página pai"
        );
        window.parent.postMessage(
          {
            type: "IFRAME_READY",
          },
          "*"
        ); // Usar '*' para permitir qualquer origem durante o desenvolvimento

        // Função alternativa para capturar UTMs diretamente da URL do iframe
        // (como fallback, caso a comunicação postMessage falhe)
        function getUtmParamsFromUrl() {
          const urlParams = new URLSearchParams(window.location.search);
          const utmFields = [
            { param: "utm_source", field: "utm_source" },
            { param: "utm_medium", field: "utm_medium" },
            { param: "utm_campaign", field: "utm_campaign" },
            { param: "utm_term", field: "utm_term" },
            { param: "utm_content", field: "utm_content" },
          ];

          utmFields.forEach((item) => {
            if (urlParams.has(item.param)) {
              document.getElementById(item.field).value = urlParams.get(
                item.param
              );
            }
          });
        }

        // Tentar capturar UTMs diretamente da URL como fallback
        getUtmParamsFromUrl();

        // Update file name when file is selected
        fileInput.addEventListener("change", function () {
          if (this.files && this.files[0]) {
            fileName.textContent = this.files[0].name;
            // Esconder a mensagem de erro se um arquivo for selecionado
            logoError.style.display = "none";

            // Verificar o tipo de arquivo imediatamente
            const file = this.files[0];
            const validTypes = ["image/png", "image/jpeg", "application/pdf"];
            if (!validTypes.includes(file.type)) {
              logoError.textContent =
                "Por favor, selecione um arquivo PNG, JPG ou PDF.";
              logoError.style.display = "block";
            }
          } else {
            fileName.textContent = "Nenhum arquivo selecionado";
          }
        });

        // Otimizar o envio do formulário para ser mais rápido
        form.addEventListener("submit", async function (e) {
          e.preventDefault();

          // Reset error messages
          emailError.style.display = "none";
          logoError.style.display = "none";
          nameError.style.display = "none";
          phoneError.style.display = "none";

          // Validate name
          const name = document.getElementById("fullname").value;
          if (!name || name.trim() === "") {
            nameError.style.display = "block";
            return;
          }

          // Validate phone
          const phone = document.getElementById("phone").value;
          if (!phone || phone.trim() === "") {
            phoneError.style.display = "block";
            return;
          }

          // Validate email
          const email = document.getElementById("email").value;
          if (!email || !email.includes("@")) {
            emailError.style.display = "block";
            return;
          }

          // Validate logo file
          const logoFile = document.getElementById("logo").files[0];
          if (!logoFile) {
            logoError.textContent =
              "Por favor, selecione um arquivo antes de enviar.";
            logoError.style.display = "block";
            fileInput.focus();
            return;
          }

          // Check file type
          const validTypes = ["image/png", "image/jpeg", "application/pdf"];
          if (!validTypes.includes(logoFile.type)) {
            logoError.textContent =
              "Por favor, selecione um arquivo PNG, JPG ou PDF.";
            logoError.style.display = "block";
            return;
          }

          // Adicionar um indicador de carregamento antes de enviar o formulário
          const submitBtn = document.getElementById("_form_1_submit");
          const originalButtonText = submitBtn.textContent;
          submitBtn.textContent = "Enviando...";
          submitBtn.disabled = true;

          // Mostrar o indicador de carregamento
          loadingIndicator.style.display = "block";

          try {
            // Preparar os dados do formulário
            const formData = new FormData();
            const fullname = document.getElementById("fullname").value;
            const phone = document.getElementById("phone").value;
            const segmento = document.getElementById("field[7]").value;

            formData.append("name", fullname);
            formData.append("email", email);
            formData.append("phone", phone);
            formData.append("segmento", segmento);
            formData.append("logo", logoFile);

            // Iniciar o upload do arquivo em paralelo com a preparação do formulário
            console.log("Iniciando upload do arquivo...");

            // Usar AbortController para poder cancelar a requisição se necessário
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos de timeout

            const response = await fetch("/api/mockup", {
              method: "POST",
              body: formData,
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              throw new Error(
                `Erro ao processar o arquivo: ${response.status} ${response.statusText}`
              );
            }

            const data = await response.json();
            console.log("Resposta do servidor:", data);

            // Preencher os campos ocultos com as URLs
            if (data.url) {
              document.getElementById("mockup_url").value = data.url;
              console.log("Campo mockup_url preenchido com:", data.url);
            } else {
              console.warn("Nenhuma URL de mockup recebida do servidor");
            }

            if (data.originalLogoUrl) {
              document.getElementById("mockup_logotipo").value =
                data.originalLogoUrl;
              console.log(
                "Campo mockup_logotipo preenchido com:",
                data.originalLogoUrl
              );
            }

            // Verificar se temos uma URL de redirecionamento
            const redirectUrl = data.redirect_url;

            console.log("Enviando formulário para o ActiveCampaign...");

            // Submeter o formulário para o ActiveCampaign
            form.submit();

            // Redirecionar a página pai para a URL de redirecionamento após um pequeno delay
            // para garantir que o formulário foi enviado
            if (redirectUrl) {
              console.log("Redirecionando para:", redirectUrl);
              setTimeout(() => {
                redirectParentPage(redirectUrl);
              }, 500); // Delay um pouco maior para garantir que o formulário foi enviado
            }
          } catch (error) {
            console.error("Erro ao processar o formulário:", error);
            alert(
              "Ocorreu um erro ao processar o formulário. Por favor, tente novamente."
            );

            // Restaurar o botão
            submitBtn.textContent = originalButtonText;
            submitBtn.disabled = false;

            // Esconder o indicador de carregamento
            loadingIndicator.style.display = "none";
          }
        });

        // Verificar se estamos em um iframe e adicionar mensagem para debugging
        if (window.parent && window.parent !== window) {
          console.log("Este formulário está sendo exibido em um iframe.");
        }
      });
    </script>

  </body>
</html>
