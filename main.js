document.addEventListener('DOMContentLoaded', function () {
  const dataInput = document.getElementById('dataInput')
  const processBtn = document.getElementById('processBtn')
  const clearBtn = document.getElementById('clearBtn')
  const searchInput = document.getElementById('searchInput')
  const searchBtn = document.getElementById('searchBtn')
  const resultsCount = document.getElementById('resultsCount')
  const groupsContainer = document.getElementById('groups')

  // Carrega dados do localStorage se existirem
  loadData()

  // Processar os dados quando o botão for clicado
  processBtn.addEventListener('click', function () {
    const rawData = dataInput.value.trim()
    if (!rawData) {
      alert('Por favor, cole os dados na área de texto.')
      return
    }

    // Carrega os dados existentes
    const existingData = localStorage.getItem('peopleData')
    let peopleData = existingData ? JSON.parse(existingData) : {}

    // Processa os novos dados
    const newData = parseData(rawData)

    // Combina os dados existentes com os novos
    for (const groupName in newData) {
      if (peopleData[groupName]) {
        // Se o grupo já existe, adiciona as novas pessoas
        peopleData[groupName] = peopleData[groupName].concat(newData[groupName])
      } else {
        // Se é um grupo novo, cria ele
        peopleData[groupName] = newData[groupName]
      }
    }

    saveData(peopleData)
    displayAllPeople(peopleData)
    dataInput.value = '' // Limpa o textarea após processar
    alert('Dados adicionados com sucesso!')
  })

  // Limpar dados
  clearBtn.addEventListener('click', function () {
    if (confirm('Tem certeza que deseja limpar todos os dados?')) {
      localStorage.removeItem('peopleData')
      dataInput.value = ''
      groupsContainer.innerHTML = ''
      resultsCount.textContent = '0 resultados encontrados'
      searchInput.value = ''
    }
  })

  // Buscar quando o botão for clicado ou enter pressionado
  searchBtn.addEventListener('click', performSearch)
  searchInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      performSearch()
    }
  })

  function parseData(rawData) {
    const lines = rawData.split('\n')
    const groups = {}
    let currentGroup = 'Geral'
    let currentPerson = null

    for (const line of lines) {
      const trimmedLine = line.trim()

      // Verifica se é uma linha vazia (separador de grupos)
      if (!trimmedLine) {
        // Se temos uma pessoa em construção, adiciona ao grupo atual
        if (currentPerson) {
          if (!groups[currentGroup]) {
            groups[currentGroup] = []
          }
          groups[currentGroup].push(currentPerson)
          currentPerson = null
        }
        continue
      }

      // Verifica se a linha começa com um código de grupo (0906, 0930, etc)
      const groupMatch = trimmedLine.match(/^(09\d{2})\b/)
      if (groupMatch) {
        // Se temos uma pessoa em construção, adiciona ao grupo atual antes de mudar
        if (currentPerson) {
          if (!groups[currentGroup]) {
            groups[currentGroup] = []
          }
          groups[currentGroup].push(currentPerson)
          currentPerson = null
        }

        currentGroup = groupMatch[1]
        continue
      }

      // Verifica se a linha começa com um número seguido de espaço (novo registro)
      const numberMatch = trimmedLine.match(/^(\d+)\s/)

      if (numberMatch) {
        // Se já temos uma pessoa em construção, adiciona ao grupo antes de começar nova
        if (currentPerson) {
          if (!groups[currentGroup]) {
            groups[currentGroup] = []
          }
          groups[currentGroup].push(currentPerson)
        }

        // Começa nova pessoa
        currentPerson = {
          number: numberMatch[1],
          data: trimmedLine.substring(numberMatch[0].length).trim()
        }
      } else if (currentPerson) {
        // Continua adicionando dados à pessoa atual
        currentPerson.data += ' ' + trimmedLine
      }
    }

    // Adiciona a última pessoa processada
    if (currentPerson) {
      if (!groups[currentGroup]) {
        groups[currentGroup] = []
      }
      groups[currentGroup].push(currentPerson)
    }

    // Processa cada pessoa para extrair os campos individuais
    const processedGroups = {}

    for (const groupName in groups) {
      processedGroups[groupName] = groups[groupName].map(person => {
        // Divide os dados em partes separadas por vírgula ou espaço
        const parts = person.data
          .split(/[, ]+/)
          .filter(part => part.trim() !== '')

        // Encontra o assento (padrão: número seguido de letra, como 1A, 17B, etc)
        let assento = ''
        const assentoIndex = parts.findIndex(part =>
          part.match(/^\d+[A-Za-z]$/)
        )

        if (assentoIndex !== -1) {
          assento = parts[assentoIndex]
          parts.splice(assentoIndex, 1) // Remove o assento da lista de partes
        }

        // Extrai os campos (assumindo que sobrenome e nome são os dois primeiros)
        const extracted = {
          number: person.number,
          sobrenome: parts.length > 0 ? parts[0] : '',
          nome: parts.length > 1 ? parts[1] : '',
          classe: parts.length > 2 ? parts[2] : '',
          assento: assento,
          outros: parts.length > 3 ? parts.slice(3).join(' ') : '',
          grupo: groupName
        }

        return extracted
      })
    }

    return processedGroups
  }

  function performSearch() {
    const searchTerm = searchInput.value.trim().toLowerCase()
    if (!searchTerm) {
      const savedData = localStorage.getItem('peopleData')
      if (savedData) {
        displayAllPeople(JSON.parse(savedData))
      }
      return
    }

    const savedData = localStorage.getItem('peopleData')
    if (!savedData) {
      alert('Por favor, processe os dados primeiro.')
      return
    }

    const peopleData = JSON.parse(savedData)
    const filteredGroups = {}
    let totalResults = 0

    // Divide os termos de busca (permite buscar por grupo e assento juntos)
    const searchTerms = searchTerm.split(' ')

    for (const groupName in peopleData) {
      const filteredPeople = peopleData[groupName].filter(person => {
        // Verifica todos os termos de busca
        return searchTerms.every(term => {
          // Verifica se o termo corresponde ao grupo
          if (groupName.toLowerCase().includes(term)) return true

          // Verifica outros campos
          return (
            person.sobrenome.toLowerCase().includes(term) ||
            person.nome.toLowerCase().includes(term) ||
            person.assento.toLowerCase().includes(term) ||
            person.number.toLowerCase().includes(term)
          )
        })
      })

      if (filteredPeople.length > 0) {
        filteredGroups[groupName] = filteredPeople
        totalResults += filteredPeople.length
      }
    }

    resultsCount.textContent = `${totalResults} resultados encontrados`
    displayGroups(filteredGroups)
  }

  function displayAllPeople(peopleData) {
    let totalResults = 0

    for (const groupName in peopleData) {
      totalResults += peopleData[groupName].length
    }

    resultsCount.textContent = `${totalResults} pessoas cadastradas`
    displayGroups(peopleData)
  }

  function displayGroups(groups) {
    groupsContainer.innerHTML = ''

    for (const groupName in groups) {
      const group = groups[groupName]
      if (group.length === 0) continue

      const groupDiv = document.createElement('div')
      groupDiv.className = 'group'

      const groupHeader = document.createElement('div')
      groupHeader.className = 'group-header'
      groupHeader.textContent = `Flight: ${groupName}`

      groupDiv.appendChild(groupHeader)

      group.forEach(person => {
        const card = document.createElement('div')
        card.className = 'person-card'

        card.innerHTML = `
                  <div class="main-info">
                      <p>${person.sobrenome}, ${person.nome}</p>
                      <p>${person.assento || 'Sem assento'}</p>
                  </div>
                  <div class="details">
                      <p><span class="highlight">Número:</span> ${
                        person.number
                      }</p>
                      <p><span class="highlight">Grupo:</span> ${
                        person.grupo
                      }</p>
                      <p><span class="highlight">Classe:</span> ${
                        person.classe
                      }</p>
                      ${
                        person.outros
                          ? `<p><span class="highlight">Outros:</span> ${person.outros}</p>`
                          : ''
                      }
                  </div>
              `

        card.addEventListener('click', function () {
          this.classList.toggle('expanded')
        })

        groupDiv.appendChild(card)
      })

      groupsContainer.appendChild(groupDiv)
    }
  }

  function saveData(data) {
    localStorage.setItem('peopleData', JSON.stringify(data))
  }

  function loadData() {
    const savedData = localStorage.getItem('peopleData')
    if (savedData) {
      const peopleData = JSON.parse(savedData)
      dataInput.value = 'Dados já processados anteriormente. Busque acima.'
      displayAllPeople(peopleData)
    }
  }
})
